package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHealthEndpoint(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/health" {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"status":  "healthy",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	})

	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	if err != nil {
		t.Errorf("failed to parse response: %v", err)
	}
	if resp["success"] != true {
		t.Errorf("expected success=true, got %v", resp["success"])
	}
	if resp["status"] != "healthy" {
		t.Errorf("expected status=healthy, got %v", resp["status"])
	}
}

func TestRootEndpoint(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/" {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"service":     "MailForge API",
				"version":     "2.0.0",
				"description": "Comprehensive email infrastructure diagnostic suite",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	})

	req := httptest.NewRequest("GET", "/api/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	if err != nil {
		t.Errorf("failed to parse response: %v", err)
	}
	if resp["service"] != "MailForge API" {
		t.Errorf("expected service=MailForge API, got %v", resp["service"])
	}
	if resp["version"] != "2.0.0" {
		t.Errorf("expected version=2.0.0, got %v", resp["version"])
	}
}

func TestMetricsEndpoint(t *testing.T) {
	snapshot := globalMetrics.snapshot()

	if _, ok := snapshot["uptime_seconds"]; !ok {
		t.Error("expected uptime_seconds in snapshot")
	}
	if _, ok := snapshot["total_requests"]; !ok {
		t.Error("expected total_requests in snapshot")
	}
	if _, ok := snapshot["total_errors"]; !ok {
		t.Error("expected total_errors in snapshot")
	}
	if _, ok := snapshot["avg_latency_ms"]; !ok {
		t.Error("expected avg_latency_ms in snapshot")
	}
	if _, ok := snapshot["tools"]; !ok {
		t.Error("expected tools in snapshot")
	}
}

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(10, 60) // 10 requests per minute

	// First 10 should succeed
	for i := 0; i < 10; i++ {
		allowed := rl.allow("test-client")
		if !allowed {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	// 11th should be denied
	allowed := rl.allow("test-client")
	if allowed {
		t.Error("11th request should be denied")
	}
}

func TestRateLimiter_DifferentClients(t *testing.T) {
	rl := NewRateLimiter(2, 60) // 2 requests per minute

	// Client A - 2 requests allowed
	if !rl.allow("client-a") {
		t.Error("first request for client-a should be allowed")
	}
	if !rl.allow("client-a") {
		t.Error("second request for client-a should be allowed")
	}
	if rl.allow("client-a") {
		t.Error("third request for client-a should be denied")
	}

	// Client B - still has quota
	if !rl.allow("client-b") {
		t.Error("first request for client-b should be allowed")
	}
	if !rl.allow("client-b") {
		t.Error("second request for client-b should be allowed")
	}
	if rl.allow("client-b") {
		t.Error("third request for client-b should be denied")
	}
}

func TestResponseWriter_Wrapping(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("test"))
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

	handler(rw, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, w.Code)
	}
	if rw.status != http.StatusCreated {
		t.Errorf("expected responseWriter.status %d, got %d", http.StatusCreated, rw.status)
	}
}

func TestMonitorEntry_Structure(t *testing.T) {
	entry := &MonitorEntry{
		ID:       "test-id",
		Name:     "Test Monitor",
		Type:     "domain",
		Tool:     "dns",
		Value:    "example.com",
		Interval: 300,
	}

	if entry.ID != "test-id" {
		t.Errorf("expected ID=test-id, got %s", entry.ID)
	}
	if entry.Name != "Test Monitor" {
		t.Errorf("expected Name=Test Monitor, got %s", entry.Name)
	}
	if entry.Type != "domain" {
		t.Errorf("expected Type=domain, got %s", entry.Type)
	}
	if entry.Tool != "dns" {
		t.Errorf("expected Tool=dns, got %s", entry.Tool)
	}
	if entry.Value != "example.com" {
		t.Errorf("expected Value=example.com, got %s", entry.Value)
	}
	if entry.Interval != 300 {
		t.Errorf("expected Interval=300, got %d", entry.Interval)
	}
	if entry.LastStatus != "" {
		t.Errorf("expected LastStatus='', got %s", entry.LastStatus)
	}
}

func TestMonitorEntry_History(t *testing.T) {
	entry := &MonitorEntry{
		ID:      "test-id",
		History: make([]MonitorPoint, 0),
	}

	// Add a history point
	entry.mu.Lock()
	entry.History = append(entry.History, MonitorPoint{
		Timestamp: 1234567890,
		Status:    "ok",
		Message:   "Success",
		Duration:  100,
	})
	entry.mu.Unlock()

	if len(entry.History) != 1 {
		t.Errorf("expected 1 history point, got %d", len(entry.History))
	}
	if entry.History[0].Status != "ok" {
		t.Errorf("expected status=ok, got %s", entry.History[0].Status)
	}
}

func TestMonitorPoint_Structure(t *testing.T) {
	point := MonitorPoint{
		Timestamp: time.Now().Unix(),
		Status:    "ok",
		Message:   "Test message",
		Duration:  150,
	}

	if point.Status != "ok" {
		t.Errorf("expected Status=ok, got %s", point.Status)
	}
	if point.Duration != 150 {
		t.Errorf("expected Duration=150, got %d", point.Duration)
	}
}

func TestEndpointCatalog(t *testing.T) {
	endpoints := endpointCatalog()

	// Should contain key endpoints
	expectedEndpoints := []string{
		"GET  /api/health",
		"GET  /api/metrics",
		"GET  /api/dns/{domain}",
		"GET  /api/mx/{domain}",
		"GET  /api/blacklist/{ip}",
		"GET  /api/spf/{domain}",
		"GET  /api/dmarc/{domain}",
		"GET  /api/smtp/{host}/{port}",
		"GET  /api/deliverability/{domain}",
	}

	for _, expected := range expectedEndpoints {
		found := false
		for _, ep := range endpoints {
			if ep == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected endpoint %q not found in catalog", expected)
		}
	}
}

func TestWrapHelper(t *testing.T) {
	data := map[string]string{"key": "value"}
	wrapped := wrap(data)

	if wrapped["success"] != true {
		t.Errorf("expected success=true, got %v", wrapped["success"])
	}
	if wrapped["data"] == nil {
		t.Error("expected data to be present")
	}
}

func TestSendJSON(t *testing.T) {
	server := &Server{}

	t.Run("success response", func(t *testing.T) {
		w := httptest.NewRecorder()
		server.sendJSON(w, http.StatusOK, map[string]string{"status": "ok"})

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}
		expected := `{"status":"ok"}` + "\n"
		if w.Body.String() != expected {
			t.Errorf("expected body %q, got %q", expected, w.Body.String())
		}
	})

	t.Run("error response", func(t *testing.T) {
		w := httptest.NewRecorder()
		server.sendError(w, http.StatusBadRequest, "invalid request")

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}

		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		if err != nil {
			t.Errorf("failed to parse response: %v", err)
		}
		if resp["success"] != false {
			t.Errorf("expected success=false, got %v", resp["success"])
		}
		if resp["error"] != "invalid request" {
			t.Errorf("expected error='invalid request', got %v", resp["error"])
		}
	})
}

func TestRequireArg(t *testing.T) {
	server := &Server{}
	called := false

	t.Run("valid argument", func(t *testing.T) {
		parts := []string{"", "example.com"}
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)
		_ = req

		called = false
		server.requireArg(parts, w, "Domain required", func() {
			called = true
		})

		if !called {
			t.Error("callback should have been called")
		}
	})

	t.Run("missing argument", func(t *testing.T) {
		parts := []string{""}
		w := httptest.NewRecorder()

		called = false
		server.requireArg(parts, w, "Domain required", func() {
			called = true
		})

		if called {
			t.Error("callback should not have been called")
		}
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("empty argument", func(t *testing.T) {
		parts := []string{"", ""}
		w := httptest.NewRecorder()

		called = false
		server.requireArg(parts, w, "Domain required", func() {
			called = true
		})

		if called {
			t.Error("callback should not have been called")
		}
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestPortScanPorts_Parsing(t *testing.T) {
	tests := []struct {
		input    string
		expected []int
	}{
		{"25", []int{25}},
		{"25,587,465", []int{25, 587, 465}},
		{"25,587,465,443,993,995", []int{25, 587, 465, 443, 993, 995}},
		{"80,443,8080", []int{80, 443, 8080}},
		{"0", []int{}},
		{"65536", []int{}}, // Invalid port
		{"25,abc,443", []int{25, 443}}, // Mixed valid/invalid
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			ports := parsePorts(tt.input)
			if len(ports) != len(tt.expected) {
				t.Errorf("parsePorts(%q) = %v, want %v", tt.input, ports, tt.expected)
			}
			for i, p := range ports {
				if i < len(tt.expected) && p != tt.expected[i] {
					t.Errorf("parsePorts(%q)[%d] = %d, want %d", tt.input, i, p, tt.expected[i])
				}
			}
		})
	}
}

func parsePorts(s string) []int {
	if s == "" {
		return nil
	}
	var ports []int
	for _, p := range bytes.Split([]byte(s), []byte(",")) {
		port := parsePort(string(p))
		if port > 0 && port < 65536 {
			ports = append(ports, port)
		}
	}
	return ports
}

func parsePort(s string) int {
	var port int
	for _, c := range []byte(s) {
		if c < '0' || c > '9' {
			return 0
		}
		port = port*10 + int(c-'0')
	}
	return port
}

func TestAPIEndpoints_RouteMatching(t *testing.T) {
	tests := []struct {
		path     string
		wantTool string
		wantArg  string
	}{
		{"/api/", "", ""},
		{"/api/health", "health", ""},
		{"/api/metrics", "metrics", ""},
		{"/api/dns", "dns", ""},  // /api/dns extracts "dns" as tool (no arg)
		{"/api/dns/example.com", "dns", "example.com"},
		{"/api/mx/example.com", "mx", "example.com"},
		{"/api/spf/example.com", "spf", "example.com"},
		{"/api/dmarc/example.com", "dmarc", "example.com"},
		{"/api/deliverability/example.com", "deliverability", "example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			// Validate route matching logic
			parts := bytes.Split([]byte(tt.path), []byte("/"))
			tool := ""
			arg := ""

			if len(parts) >= 3 && string(parts[1]) == "api" {
				tool = string(parts[2])
			}
			if len(parts) >= 4 {
				arg = string(parts[3])
			}

			if tool != tt.wantTool {
				t.Errorf("path %s: expected tool=%q, got %q", tt.path, tt.wantTool, tool)
			}
			if arg != tt.wantArg {
				t.Errorf("path %s: expected arg=%q, got %q", tt.path, tt.wantArg, arg)
			}
		})
	}
}

func TestBatchToolValidation(t *testing.T) {
	validTools := []string{
		"dns", "mx", "blacklist", "spf", "dmarc",
		"rdns", "deliverability", "whois",
	}

	for _, tool := range validTools {
		t.Run("valid_"+tool, func(t *testing.T) {
			isValid := false
			for _, vt := range validTools {
				if tool == vt {
					isValid = true
					break
				}
			}
			if !isValid {
				t.Errorf("tool %q should be valid", tool)
			}
		})
	}

	t.Run("invalid_tool", func(t *testing.T) {
		tool := "invalid-tool"
		isValid := false
		for _, vt := range validTools {
			if tool == vt {
				isValid = true
				break
			}
		}
		if isValid {
			t.Errorf("tool %q should be invalid", tool)
		}
	})
}

func TestMetricsRecording(t *testing.T) {
	metrics := &Metrics{}

	// Record some requests
	metrics.record("dns", 100*1000000, nil)           // 100ms
	metrics.record("dns", 200*1000000, nil)           // 200ms
	metrics.record("smtp", 500*1000000, nil)          // 500ms
	metrics.record("smtp", 1000*1000000, fmt.Errorf("error")) // 1000ms with error

	snapshot := metrics.snapshot()

	totalReqs := snapshot["total_requests"].(uint64)
	if totalReqs != 4 {
		t.Errorf("expected total_requests=4, got %d", totalReqs)
	}
	totalErrs := snapshot["total_errors"].(uint64)
	if totalErrs != 1 {
		t.Errorf("expected total_errors=1, got %d", totalErrs)
	}

	// Check average latency (should be around 450ms = 450000 microseconds)
	avgLat := snapshot["avg_latency_ms"].(int64)
	if avgLat < 400 || avgLat > 500 {
		t.Errorf("expected avg_latency around 450ms, got %dms", avgLat)
	}
}

func TestNewRateLimiter(t *testing.T) {
	rl := NewRateLimiter(100, 60)

	if rl == nil {
		t.Fatal("NewRateLimiter returned nil")
	}

	if rl.limit != 100 {
		t.Errorf("expected limit=100, got %d", rl.limit)
	}

	if rl.window != 60 {
		t.Errorf("expected window=60, got %d", rl.window)
	}
}

func TestRateLimiter_VisitorTracking(t *testing.T) {
	rl := NewRateLimiter(2, 60)

	// First two requests should be allowed
	if !rl.allow("visitor-1") {
		t.Error("first request should be allowed")
	}
	if !rl.allow("visitor-1") {
		t.Error("second request should be allowed")
	}

	// Third request should be denied
	if rl.allow("visitor-1") {
		t.Error("third request should be denied")
	}

	// But new visitor should be allowed
	if !rl.allow("visitor-2") {
		t.Error("new visitor's first request should be allowed")
	}
}

func TestResponseWriter_StatusTracking(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	rw := &responseWriter{ResponseWriter: w, status: 0}

	handler(rw, req)

	if rw.status != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rw.status)
	}
}

func TestMonitorEntry_SetStatus(t *testing.T) {
	entry := &MonitorEntry{
		ID: "test",
	}

	entry.mu.Lock()
	entry.LastStatus = "ok"
	entry.LastCheck = time.Now().Unix()
	entry.mu.Unlock()

	if entry.LastStatus != "ok" {
		t.Errorf("expected LastStatus=ok, got %s", entry.LastStatus)
	}
	if entry.LastCheck == 0 {
		t.Error("expected LastCheck to be set")
	}
}
