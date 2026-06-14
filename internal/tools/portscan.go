package tools

import (
	"context"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"
)

type PortDef struct {
	Port int
	Name string
}

var CommonPorts = []PortDef{
	{21, "FTP"},
	{22, "SSH"},
	{23, "Telnet"},
	{25, "SMTP"},
	{53, "DNS"},
	{80, "HTTP"},
	{110, "POP3"},
	{111, "RPC"},
	{135, "MSRPC"},
	{139, "NetBIOS"},
	{143, "IMAP"},
	{443, "HTTPS"},
	{445, "SMB"},
	{465, "SMTPS"},
	{587, "Submission"},
	{993, "IMAPS"},
	{995, "POP3S"},
	{1433, "MSSQL"},
	{1521, "Oracle"},
	{3306, "MySQL"},
	{3389, "RDP"},
	{5432, "PostgreSQL"},
	{5900, "VNC"},
	{6379, "Redis"},
	{8080, "HTTP-Alt"},
	{8443, "HTTPS-Alt"},
	{9200, "Elasticsearch"},
	{27017, "MongoDB"},
}

func ScanPorts(host string, ports []int) PortScanResult {
	start := time.Now()
	result := PortScanResult{
		Host:  host,
		Ports: []PortInfo{},
	}

	// Resolve IP
	ips, err := net.LookupIP(host)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to resolve host: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	if len(ips) > 0 {
		result.IP = ips[0].String()
	}

	// Use common ports if none specified
	if len(ports) == 0 {
		for _, p := range CommonPorts {
			ports = append(ports, p.Port)
		}
	}

	// Scan concurrently
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 50) // Limit concurrency

	for _, port := range ports {
		wg.Add(1)
		sem <- struct{}{}
		go func(p int) {
			defer wg.Done()
			defer func() { <-sem }()

			info := scanPort(host, p)
			mu.Lock()
			result.Ports = append(result.Ports, info)
			mu.Unlock()
		}(port)
	}
	wg.Wait()

	// Sort by port number
	sort.Slice(result.Ports, func(i, j int) bool {
		return result.Ports[i].Port < result.Ports[j].Port
	})

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func scanPort(host string, port int) PortInfo {
	info := PortInfo{Port: port, State: "closed"}

	addr := fmt.Sprintf("%s:%d", host, port)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			info.State = "filtered"
		}
		return info
	}
	info.State = "open"

	// Get service name
	info.Name = getServiceName(port)

	// Try to read banner
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	buf := make([]byte, 1024)
	n, err := conn.Read(buf)
	if err == nil && n > 0 {
		banner := strings.TrimSpace(string(buf[:n]))
		if len(banner) > 100 {
			banner = banner[:100] + "..."
		}
		info.Banner = banner
	}

	conn.Close()
	return info
}

func getServiceName(port int) string {
	for _, p := range CommonPorts {
		if p.Port == port {
			return p.Name
		}
	}
	return "unknown"
}
