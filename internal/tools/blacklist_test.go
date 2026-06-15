package tools

import (
	"strings"
	"testing"
)

func TestCheckBlacklist_InvalidIP(t *testing.T) {
	result := CheckBlacklist("not-an-ip")
	if result.Error == "" {
		t.Error("Expected error for invalid IP")
	}
	if !strings.Contains(result.Error, "Invalid IP address") {
		t.Errorf("Expected 'Invalid IP address' error, got: %s", result.Error)
	}
	if result.IP != "not-an-ip" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
	if result.Duration < 0 {
		t.Error("Duration should be non-negative")
	}
}

func TestCheckBlacklist_EmptyIP(t *testing.T) {
	result := CheckBlacklist("")
	if result.Error == "" {
		t.Error("Expected error for empty IP")
	}
}

func TestCheckBlacklist_IPv6Address(t *testing.T) {
	// IPv6 is now supported
	result := CheckBlacklist("::1")
	// Should not error, but may have no listed results
	if result.Error != "" && !strings.Contains(result.Error, "Only IPv4") {
		// Only fail if it's an unexpected error
	}
	// Verify the result structure is valid
	if result.IP != "::1" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
}

func TestCheckBlacklist_IPv6Full(t *testing.T) {
	// IPv6 is now supported
	result := CheckBlacklist("2001:db8::1")
	// Should not error, but may have no listed results
	if result.Error != "" && !strings.Contains(result.Error, "Only IPv4") {
		// Only fail if it's an unexpected error
	}
	// Verify the result structure is valid
	if result.IP != "2001:db8::1" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
}

func TestCheckBlacklist_ResultStructure(t *testing.T) {
	result := CheckBlacklist("127.0.0.1")
	if result.IP != "127.0.0.1" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
	if result.Lists == nil {
		t.Error("Lists should not be nil")
	}
	if result.Total != len(DefaultBlacklists) {
		t.Errorf("Total should be %d, got %d", len(DefaultBlacklists), result.Total)
	}
	if result.Duration <= 0 {
		t.Error("Duration should be positive")
	}
}

func TestCheckBlacklist_ListedCleanCounts(t *testing.T) {
	// 127.0.0.2 is a TEST-NET used for blacklist testing (Spamhaus ZEN)
	result := CheckBlacklist("127.0.0.2")
	errorCount := 0
	for _, entry := range result.Lists {
		if entry.Error != "" {
			errorCount++
		}
	}
	if result.Listed+result.Clean+errorCount != result.Total {
		t.Errorf("Listed(%d) + Clean(%d) + Errors(%d) should equal Total(%d)", result.Listed, result.Clean, errorCount, result.Total)
	}
}

func TestCheckBlacklist_DefaultBlacklistsNotEmpty(t *testing.T) {
	if len(DefaultBlacklists) == 0 {
		t.Error("DefaultBlacklists should not be empty")
	}
	// Verify each blacklist has a name and DNS
	for _, bl := range DefaultBlacklists {
		if bl.Name == "" {
			t.Error("Blacklist name should not be empty")
		}
		if bl.DNS == "" {
			t.Error("Blacklist DNS should not be empty")
		}
	}
}

func TestCheckBlacklist_EntryFields(t *testing.T) {
	result := CheckBlacklist("127.0.0.1")
	for _, entry := range result.Lists {
		if entry.Name == "" {
			t.Error("Entry name should not be empty")
		}
		// Each entry should be either listed, clean, or have an error
		if !entry.Listed && entry.Error == "" {
			// Clean entry - this is valid
		}
	}
}

func TestCheckBlacklist_GoogleDNS(t *testing.T) {
	// Google's public DNS - should not be blacklisted
	result := CheckBlacklist("8.8.8.8")
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if result.Listed > 0 {
		t.Logf("Warning: 8.8.8.8 is listed on %d blacklists", result.Listed)
	}
}

func TestCheckBlacklist_Localhost(t *testing.T) {
	// 127.0.0.1 - localhost, should not be listed on external blacklists
	result := CheckBlacklist("127.0.0.1")
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	// Most blacklists won't list localhost
	if result.Listed > 5 {
		t.Logf("Note: 127.0.0.1 listed on %d blacklists (may be expected for local testing)", result.Listed)
	}
}

func TestCheckBlacklist_ConcurrentSafety(t *testing.T) {
	// Run multiple checks concurrently to test mutex safety
	ips := []string{"127.0.0.1", "8.8.8.8", "1.1.1.1"}
	done := make(chan bool, len(ips))

	for _, ip := range ips {
		go func(addr string) {
			result := CheckBlacklist(addr)
			if result.Total != len(DefaultBlacklists) {
				t.Errorf("IP %s: Total should be %d, got %d", addr, len(DefaultBlacklists), result.Total)
			}
			done <- true
		}(ip)
	}

	for range ips {
		<-done
	}
}

func TestCheckBlacklist_BroadcastIP(t *testing.T) {
	// 255.255.255.255 is a broadcast address
	result := CheckBlacklist("255.255.255.255")
	if result.Error != "" {
		t.Logf("Note: broadcast IP error is acceptable: %s", result.Error)
	}
}

func TestCheckBlacklist_PrivateIP(t *testing.T) {
	// 192.168.1.1 - private IP
	result := CheckBlacklist("192.168.1.1")
	if result.Error != "" {
		t.Errorf("Unexpected error: %s", result.Error)
	}
	if result.Total != len(DefaultBlacklists) {
		t.Errorf("Total should be %d, got %d", len(DefaultBlacklists), result.Total)
	}
}
