package api

import (
	"encoding/json"
	"log"
	"mailforge/internal/tools"
	"strconv"
	"sync"
	"time"
)

// MonitorEntry represents a single monitored target
type MonitorEntry struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"` // domain | ip | host
	Tool       string         `json:"tool"` // dns | smtp | spf | dmarc | blacklist | ports
	Value      string         `json:"value"`
	Interval   int            `json:"interval"` // seconds
	LastStatus string         `json:"last_status"`
	LastCheck  int64          `json:"last_check"`
	History    []MonitorPoint `json:"history"`
	mu         sync.Mutex
}

type MonitorPoint struct {
	Timestamp int64  `json:"timestamp"`
	Status    string `json:"status"`
	Message   string `json:"message"`
	Duration  int64  `json:"duration_ms"`
}

var (
	monitorStore = struct {
		sync.RWMutex
		entries map[string]*MonitorEntry
	}{entries: make(map[string]*MonitorEntry)}

	monitorSubscribersMu sync.RWMutex
	monitorSubscribers   = make(map[chan []byte]struct{})
)

// AddMonitor adds a target to the monitor pool
func AddMonitor(entry *MonitorEntry) {
	monitorStore.Lock()
	defer monitorStore.Unlock()
	if entry.ID == "" {
		entry.ID = time.Now().Format("20060102150405.000000")
	}
	if entry.Interval < 10 {
		entry.Interval = 60
	}
	entry.History = []MonitorPoint{}
	monitorStore.entries[entry.ID] = entry
	go runMonitorLoop(entry)
}

func RemoveMonitor(id string) bool {
	monitorStore.Lock()
	defer monitorStore.Unlock()
	if _, ok := monitorStore.entries[id]; ok {
		delete(monitorStore.entries, id)
		return true
	}
	return false
}

func ListMonitors() []*MonitorEntry {
	monitorStore.RLock()
	defer monitorStore.RUnlock()
	out := make([]*MonitorEntry, 0, len(monitorStore.entries))
	for _, e := range monitorStore.entries {
		out = append(out, e)
	}
	return out
}

func GetMonitor(id string) *MonitorEntry {
	monitorStore.RLock()
	defer monitorStore.RUnlock()
	return monitorStore.entries[id]
}

func runMonitorLoop(entry *MonitorEntry) {
	t := time.NewTicker(time.Duration(entry.Interval) * time.Second)
	defer t.Stop()
	// Run immediately on start
	runMonitorCheck(entry)
	for range t.C {
		runMonitorCheck(entry)
	}
}

func runMonitorCheck(entry *MonitorEntry) {
	start := time.Now()
	status := "ok"
	message := ""
	var err error

	switch entry.Tool {
	case "dns":
		r := tools.LookupDNS(entry.Value)
		if r.Error != "" {
			status = "error"
			message = r.Error
		} else {
			message = "DNS resolved"
		}
	case "mx":
		r := tools.LookupMX(entry.Value)
		if r.Error != "" {
			status = "error"
			message = r.Error
		} else if len(r.MX) == 0 {
			status = "warning"
			message = "No MX records"
		} else {
			message = "MX healthy"
		}
	case "spf":
		r := tools.CheckSPF(entry.Value)
		if !r.Valid || r.Error != "" {
			status = "error"
			message = r.Error
			if message == "" {
				message = "SPF invalid"
			}
		} else {
			message = "SPF valid"
		}
	case "dmarc":
		r := tools.CheckDMARC(entry.Value)
		if !r.Valid || r.Error != "" {
			status = "error"
			message = r.Error
			if message == "" {
				message = "DMARC missing"
			}
		} else {
			message = "DMARC " + r.Policy
		}
	case "blacklist":
		ip := entry.Value
		if entry.Type == "domain" {
			dns := tools.LookupDNS(entry.Value)
			if len(dns.A) > 0 {
				ip = dns.A[0].IP
			}
		}
		r := tools.CheckBlacklist(ip)
		if r.Error != "" {
			status = "error"
			message = r.Error
		} else if r.Listed > 0 {
			status = "error"
			message = "Listed on " + strconv.Itoa(r.Listed) + " blacklists"
		} else {
			message = "Clean"
		}
	case "smtp":
		host := entry.Value
		port := 25
		if entry.Type == "host" {
			// value already has host:port? otherwise default
		}
		r := tools.TestSMTP(host, port)
		if !r.Connected {
			status = "error"
			message = r.Error
		} else if !r.STARTTLS {
			status = "warning"
			message = "SMTP up but no STARTTLS"
		} else {
			message = "SMTP healthy, TLS " + r.TLSVersion
		}
	case "ports":
		r := tools.ScanPorts(entry.Value, nil)
		if r.Error != "" {
			status = "error"
			message = r.Error
		} else {
			open := 0
			for _, p := range r.Ports {
				if p.State == "open" {
					open++
				}
			}
			message = "Scan complete, " + strconv.Itoa(open) + " open"
		}
	case "deliverability":
		r := tools.ComputeDeliverability(entry.Value)
		switch r.Grade {
		case "F", "D":
			status = "error"
		case "C":
			status = "warning"
		default:
			status = "ok"
		}
		message = "Score " + strconv.Itoa(r.Score) + " (" + r.Grade + ")"
	}

	if err != nil {
		_ = err
	}

	entry.mu.Lock()
	entry.LastStatus = status
	entry.LastCheck = time.Now().Unix()
	entry.History = append(entry.History, MonitorPoint{
		Timestamp: time.Now().Unix(),
		Status:    status,
		Message:   message,
		Duration:  time.Since(start).Milliseconds(),
	})
	if len(entry.History) > 200 {
		entry.History = entry.History[len(entry.History)-200:]
	}
	entry.mu.Unlock()

	// Broadcast via WebSocket subscribers
	broadcastMonitorUpdate(entry)
}

func broadcastMonitorUpdate(entry *MonitorEntry) {
	monitorSubscribersMu.RLock()
	defer monitorSubscribersMu.RUnlock()
	if len(monitorSubscribers) == 0 {
		return
	}
	payload := map[string]interface{}{
		"type":    "monitor_update",
		"id":      entry.ID,
		"status":  entry.LastStatus,
		"message": entry.LastCheck,
		"history": entry.History,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	for ch := range monitorSubscribers {
		select {
		case ch <- data:
		default:
		}
	}
}

func SubscribeMonitor() chan []byte {
	ch := make(chan []byte, 16)
	monitorSubscribersMu.Lock()
	monitorSubscribers[ch] = struct{}{}
	monitorSubscribersMu.Unlock()
	return ch
}

func UnsubscribeMonitor(ch chan []byte) {
	monitorSubscribersMu.Lock()
	if _, ok := monitorSubscribers[ch]; ok {
		delete(monitorSubscribers, ch)
		close(ch)
	}
	monitorSubscribersMu.Unlock()
}

func init() {
	// Heartbeat logging
	go func() {
		t := time.NewTicker(5 * time.Minute)
		defer t.Stop()
		for range t.C {
			monitors := ListMonitors()
			if len(monitors) > 0 {
				log.Printf("📊 Active monitors: %d", len(monitors))
			}
		}
	}()
}
