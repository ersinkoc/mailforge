package api

import (
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds request-level counters and timings
type Metrics struct {
	StartTime    time.Time
	totalReqs    uint64
	totalErrors  uint64
	totalLatency int64 // microseconds
	byTool       sync.Map // string -> *toolMetric
}

type toolMetric struct {
	count     uint64
	errors    uint64
	latencyNs int64
	lastUsed  int64 // unix nano
}

var globalMetrics = &Metrics{
	StartTime: time.Now(),
}

func (m *Metrics) record(tool string, latency time.Duration, err error) {
	atomic.AddUint64(&m.totalReqs, 1)
	atomic.AddInt64(&m.totalLatency, latency.Microseconds())
	if err != nil {
		atomic.AddUint64(&m.totalErrors, 1)
	}
	val, _ := m.byTool.LoadOrStore(tool, &toolMetric{})
	tm := val.(*toolMetric)
	atomic.AddUint64(&tm.count, 1)
	atomic.AddInt64(&tm.latencyNs, latency.Nanoseconds())
	atomic.StoreInt64(&tm.lastUsed, time.Now().UnixNano())
	if err != nil {
		atomic.AddUint64(&tm.errors, 1)
	}
}

func (m *Metrics) snapshot() map[string]interface{} {
	totalReqs := atomic.LoadUint64(&m.totalReqs)
	totalErrors := atomic.LoadUint64(&m.totalErrors)
	totalLat := atomic.LoadInt64(&m.totalLatency)

	tools := []map[string]interface{}{}
	m.byTool.Range(func(key, value interface{}) bool {
		tm := value.(*toolMetric)
		count := atomic.LoadUint64(&tm.count)
		errs := atomic.LoadUint64(&tm.errors)
		avgLat := int64(0)
		if count > 0 {
			avgLat = atomic.LoadInt64(&tm.latencyNs) / int64(count) / 1_000_000 // ms
		}
		tools = append(tools, map[string]interface{}{
			"tool":          key.(string),
			"requests":      count,
			"errors":        errs,
			"avg_latency_ms": avgLat,
			"last_used":     time.Unix(0, atomic.LoadInt64(&tm.lastUsed)).UTC().Format(time.RFC3339),
		})
		return true
	})

	avgLat := int64(0)
	if totalReqs > 0 {
		avgLat = totalLat / int64(totalReqs) / 1000 // ms
	}

	return map[string]interface{}{
		"uptime_seconds": int64(time.Since(m.StartTime).Seconds()),
		"total_requests": totalReqs,
		"total_errors":   totalErrors,
		"avg_latency_ms": avgLat,
		"tools":          tools,
	}
}
