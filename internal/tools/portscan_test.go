package tools

import (
	"fmt"
	"net"
	"sort"
	"strings"
	"testing"
	"time"
)

func TestGetServiceName_KnownPorts(t *testing.T) {
	tests := []struct {
		port     int
		expected string
	}{
		{21, "FTP"},
		{22, "SSH"},
		{23, "Telnet"},
		{25, "SMTP"},
		{53, "DNS"},
		{80, "HTTP"},
		{110, "POP3"},
		{143, "IMAP"},
		{443, "HTTPS"},
		{465, "SMTPS"},
		{587, "Submission"},
		{993, "IMAPS"},
		{995, "POP3S"},
		{1433, "MSSQL"},
		{3306, "MySQL"},
		{5432, "PostgreSQL"},
		{6379, "Redis"},
		{8080, "HTTP-Alt"},
		{27017, "MongoDB"},
	}

	for _, tt := range tests {
		result := getServiceName(tt.port)
		if result != tt.expected {
			t.Errorf("getServiceName(%d) = %q, want %q", tt.port, result, tt.expected)
		}
	}
}

func TestGetServiceName_UnknownPort(t *testing.T) {
	result := getServiceName(99999)
	if result != "unknown" {
		t.Errorf("getServiceName(99999) = %q, want \"unknown\"", result)
	}
}

func TestGetServiceName_ZeroPort(t *testing.T) {
	result := getServiceName(0)
	if result != "unknown" {
		t.Errorf("getServiceName(0) = %q, want \"unknown\"", result)
	}
}

func TestScanPorts_InvalidHost(t *testing.T) {
	result := ScanPorts("this-host-definitely-does-not-exist-xyz123.invalid", []int{80})
	if result.Error == "" {
		t.Error("Expected error for invalid host")
	}
	if result.Host != "this-host-definitely-does-not-exist-xyz123.invalid" {
		t.Errorf("Host mismatch: got %q", result.Host)
	}
	if result.IP != "" {
		t.Errorf("Expected empty IP for invalid host, got %q", result.IP)
	}
	if result.Duration <= 0 {
		t.Error("Expected positive duration")
	}
}

func TestScanPorts_SpecificPorts(t *testing.T) {
	// Scan a few closed ports on localhost — should return closed state
	result := ScanPorts("127.0.0.1", []int{19999, 19998, 19997})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if result.IP != "127.0.0.1" {
		t.Errorf("Expected IP 127.0.0.1, got %q", result.IP)
	}
	if len(result.Ports) != 3 {
		t.Errorf("Expected 3 port results, got %d", len(result.Ports))
	}
	// Results should be sorted by port number
	if len(result.Ports) >= 2 {
		for i := 1; i < len(result.Ports); i++ {
			if result.Ports[i].Port < result.Ports[i-1].Port {
				t.Error("Ports should be sorted by port number")
				break
			}
		}
	}
}

func TestScanPorts_EmptyPortList(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping full port scan in short mode")
	}
	// Empty port list should use common ports
	result := ScanPorts("127.0.0.1", []int{})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	// Should scan all common ports
	if len(result.Ports) != len(CommonPorts) {
		t.Errorf("Expected %d port results (common ports), got %d", len(CommonPorts), len(result.Ports))
	}
}

func TestScanPorts_NilPortList(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping full port scan in short mode")
	}
	// Nil port list should use common ports
	result := ScanPorts("127.0.0.1", nil)
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != len(CommonPorts) {
		t.Errorf("Expected %d port results (common ports), got %d", len(CommonPorts), len(result.Ports))
	}
}

func TestScanPorts_TimeoutBehavior(t *testing.T) {
	// Scan a non-routable IP (TEST-NET-1, RFC 5737) to test timeout
	result := ScanPorts("192.0.2.1", []int{80})
	if result.Error != "" {
		t.Logf("Note: error on non-routable IP is acceptable: %s", result.Error)
	}
	if len(result.Ports) > 0 {
		port := result.Ports[0]
		// Port should be either closed or filtered (timeout)
		if port.State != "closed" && port.State != "filtered" {
			t.Errorf("Expected state 'closed' or 'filtered' for timeout, got %q", port.State)
		}
	}
}

func TestScanPorts_PortStates(t *testing.T) {
	// Scan a closed port on localhost
	result := ScanPorts("127.0.0.1", []int{19999})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}
	port := result.Ports[0]
	if port.Port != 19999 {
		t.Errorf("Port mismatch: got %d", port.Port)
	}
	if port.State != "closed" {
		t.Errorf("Expected state 'closed', got %q", port.State)
	}
}

func TestScanPorts_SortOrder(t *testing.T) {
	// Scan ports in reverse order, should be returned sorted
	result := ScanPorts("127.0.0.1", []int{300, 100, 200})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 3 {
		t.Fatalf("Expected 3 port results, got %d", len(result.Ports))
	}
	ports := make([]int, len(result.Ports))
	for i, p := range result.Ports {
		ports[i] = p.Port
	}
	if !sort.IntsAreSorted(ports) {
		t.Errorf("Ports should be sorted, got %v", ports)
	}
}

func TestScanPorts_Duration(t *testing.T) {
	result := ScanPorts("127.0.0.1", []int{19999})
	if result.Duration < 0 {
		t.Errorf("Duration should be non-negative, got %d", result.Duration)
	}
}

func TestScanPorts_ResultStructure(t *testing.T) {
	result := ScanPorts("127.0.0.1", []int{19999})
	if result.Host != "127.0.0.1" {
		t.Errorf("Host mismatch: got %q", result.Host)
	}
	if result.Ports == nil {
		t.Error("Ports should not be nil")
	}
}

func TestScanPorts_SinglePort(t *testing.T) {
	result := ScanPorts("127.0.0.1", []int{19999})
	if len(result.Ports) != 1 {
		t.Errorf("Expected 1 port result, got %d", len(result.Ports))
	}
	if result.Ports[0].Port != 19999 {
		t.Errorf("Port mismatch: got %d", result.Ports[0].Port)
	}
}

func TestScanPorts_MultipleConcurrent(t *testing.T) {
	// Scan many ports concurrently
	ports := make([]int, 20)
	for i := range ports {
		ports[i] = 20000 + i
	}
	result := ScanPorts("127.0.0.1", ports)
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 20 {
		t.Errorf("Expected 20 port results, got %d", len(result.Ports))
	}
}

func TestScanPorts_CommonPortsCount(t *testing.T) {
	if len(CommonPorts) == 0 {
		t.Error("CommonPorts should not be empty")
	}
	// Verify all common ports have valid port numbers
	for _, p := range CommonPorts {
		if p.Port <= 0 || p.Port > 65535 {
			t.Errorf("Invalid port number: %d", p.Port)
		}
		if p.Name == "" {
			t.Errorf("Port %d should have a name", p.Port)
		}
	}
}

func TestScanPorts_IPResolution(t *testing.T) {
	result := ScanPorts("localhost", []int{19999})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	// localhost should resolve to an IP
	if result.IP == "" {
		t.Error("Expected non-empty IP for localhost")
	}
}

func TestScanPorts_BannerTruncation(t *testing.T) {
	// Start a mock TCP server that sends a long banner (>100 chars)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	longBanner := strings.Repeat("A", 200) // 200 chars, should be truncated to 100 + "..."

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", longBanner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}

	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	if portInfo.Banner == "" {
		t.Error("Expected non-empty banner")
	}
	// Banner should be truncated to 100 chars + "..."
	if len(portInfo.Banner) > 103 {
		t.Errorf("Banner should be truncated to ~103 chars (100 + '...'), got %d chars: %q", len(portInfo.Banner), portInfo.Banner)
	}
	if !strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("Truncated banner should end with '...', got: %q", portInfo.Banner)
	}
}

func TestScanPorts_BannerShortNoTruncation(t *testing.T) {
	// Start a mock TCP server that sends a short banner (<100 chars)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	shortBanner := "SSH-2.0-OpenSSH_8.9"

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", shortBanner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}

	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	if portInfo.Banner != shortBanner {
		t.Errorf("Banner should not be truncated for short strings, got %q, want %q", portInfo.Banner, shortBanner)
	}
	if strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("Short banner should not end with '...', got: %q", portInfo.Banner)
	}
}

func TestScanPorts_Banner99Chars(t *testing.T) {
	// Banner 99 chars — should NOT be truncated
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	banner := strings.Repeat("D", 99) // 99 chars — just under the limit

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", banner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}
	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	if strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("99-char banner should NOT be truncated, got: %q", portInfo.Banner)
	}
	if len(portInfo.Banner) != 99 {
		t.Errorf("Expected banner length 99, got %d: %q", len(portInfo.Banner), portInfo.Banner)
	}
}

func TestScanPorts_Banner102Chars(t *testing.T) {
	// Banner 102 chars — should be truncated to 100 + "..."
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	banner := strings.Repeat("E", 102) // 102 chars — 2 over the limit

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", banner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}
	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	if !strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("102-char banner should be truncated with '...', got: %q", portInfo.Banner)
	}
	if len(portInfo.Banner) != 103 {
		t.Errorf("Expected truncated banner length 103 (100+'...'), got %d: %q", len(portInfo.Banner), portInfo.Banner)
	}
}

func TestScanPorts_BannerExactly100Chars(t *testing.T) {
	// Banner exactly 100 chars — should NOT be truncated (no "..." suffix)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	banner := strings.Repeat("B", 100) // exactly 100 chars

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", banner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}
	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	// TrimSpace removes the trailing newline, so banner stays 100 chars — no truncation
	if strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("100-char banner should NOT be truncated, got: %q", portInfo.Banner)
	}
	if len(portInfo.Banner) != 100 {
		t.Errorf("Expected banner length 100, got %d: %q", len(portInfo.Banner), portInfo.Banner)
	}
}

func TestScanPorts_BannerExactly101Chars(t *testing.T) {
	// Banner 101 chars — should be truncated to 100 + "..."
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer ln.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	banner := strings.Repeat("C", 101) // 101 chars — one over the limit

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			fmt.Fprintf(conn, "%s\n", banner)
			conn.Close()
		}
	}()

	result := ScanPorts("127.0.0.1", []int{port})
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if len(result.Ports) != 1 {
		t.Fatalf("Expected 1 port result, got %d", len(result.Ports))
	}
	portInfo := result.Ports[0]
	if portInfo.State != "open" {
		t.Errorf("Expected state 'open', got %q", portInfo.State)
	}
	if !strings.HasSuffix(portInfo.Banner, "...") {
		t.Errorf("101-char banner should be truncated with '...', got: %q", portInfo.Banner)
	}
	if len(portInfo.Banner) != 103 {
		t.Errorf("Expected truncated banner length 103 (100+'...'), got %d: %q", len(portInfo.Banner), portInfo.Banner)
	}
}

func TestScanPorts_TimeoutMultiplePorts(t *testing.T) {
	// Scan multiple non-routable ports to verify timeout handling
	result := ScanPorts("192.0.2.1", []int{80, 443, 22})
	if result.Error != "" {
		t.Logf("Note: error on non-routable IP is acceptable: %s", result.Error)
	}
	if len(result.Ports) != 3 {
		t.Fatalf("Expected 3 port results, got %d", len(result.Ports))
	}
	for _, port := range result.Ports {
		if port.State != "closed" && port.State != "filtered" {
			t.Errorf("Port %d: expected state 'closed' or 'filtered' for timeout, got %q", port.Port, port.State)
		}
	}
}

func TestScanPorts_TimeoutDuration(t *testing.T) {
	// Verify that timeout scan completes in reasonable time
	start := time.Now()
	ScanPorts("192.0.2.1", []int{80})
	elapsed := time.Since(start)
	// Should complete within 10 seconds (3s timeout + overhead)
	if elapsed > 10*time.Second {
		t.Errorf("Timeout scan took too long: %v", elapsed)
	}
}
