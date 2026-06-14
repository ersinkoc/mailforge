package tools

import (
	"strings"
	"testing"
)

func TestLookupDNS_ExistingDomain(t *testing.T) {
	result := LookupDNS("google.com")
	if result.Domain != "google.com" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	if result.Duration <= 0 {
		t.Error("Expected positive duration")
	}
	// google.com should have MX records
	if len(result.MX) == 0 {
		t.Error("Expected MX records for google.com")
	}
	// google.com should have A records
	if len(result.A) == 0 {
		t.Error("Expected A records for google.com")
	}
	// google.com should have TXT records
	if len(result.TXT) == 0 {
		t.Error("Expected TXT records for google.com")
	}
	// google.com should have NS records
	if len(result.NS) == 0 {
		t.Error("Expected NS records for google.com")
	}
}

func TestLookupDNS_NonExistentDomain(t *testing.T) {
	result := LookupDNS("this-domain-definitely-does-not-exist-xyz123.example")
	if result.Domain != "this-domain-definitely-does-not-exist-xyz123.example" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	// Should not panic
	if result.Duration < 0 {
		t.Error("Duration should be non-negative")
	}
}

func TestLookupDNS_DomainWithTrailingDot(t *testing.T) {
	result := LookupDNS("google.com.")
	if result.Domain != "google.com" {
		t.Errorf("Expected trailing dot removed, got %q", result.Domain)
	}
}

func TestLookupDNS_ResultStructure(t *testing.T) {
	result := LookupDNS("example.com")
	if result.MX == nil {
		t.Error("MX should not be nil")
	}
	if result.A == nil {
		t.Error("A should not be nil")
	}
	if result.TXT == nil {
		t.Error("TXT should not be nil")
	}
	if result.NS == nil {
		t.Error("NS should not be nil")
	}
}

func TestLookupMX_ExistingDomain(t *testing.T) {
	result := LookupMX("google.com")
	if result.Domain != "google.com" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	// Duration can be 0 on very fast / cached responses, so we only require >= 0
	if result.Duration < 0 {
		t.Error("Duration should be non-negative")
	}
	if len(result.MX) == 0 {
		t.Error("Expected MX records for google.com")
	}
	// Each MX record should have a valid host
	for _, mx := range result.MX {
		if mx.Host == "" {
			t.Error("MX host should not be empty")
		}
		if mx.Priority == 0 {
			t.Error("MX priority should not be 0")
		}
		if !mx.Valid {
			t.Errorf("MX host %q should be marked as valid", mx.Host)
		}
	}
}

func TestLookupMX_NonExistentDomain(t *testing.T) {
	result := LookupMX("this-domain-definitely-does-not-exist-xyz123.example")
	if result.Warn == "" && result.Error == "" {
		t.Error("Expected warning or error for non-existent domain")
	}
}

func TestLookupMX_DomainWithTrailingDot(t *testing.T) {
	result := LookupMX("google.com.")
	if result.Domain != "google.com" {
		t.Errorf("Expected trailing dot removed, got %q", result.Domain)
	}
}

func TestReverseDNS_ExistingIP(t *testing.T) {
	// Google's DNS server
	result := ReverseDNS("8.8.8.8")
	if result.IP != "8.8.8.8" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
	if result.Duration < 0 {
		t.Error("Expected non-negative duration")
	}
	// 8.8.8.8 should have a PTR record
	if len(result.Hosts) == 0 {
		t.Log("Warning: 8.8.8.8 has no PTR record (this may be expected in some environments)")
	}
}

func TestReverseDNS_InvalidIP(t *testing.T) {
	result := ReverseDNS("not-an-ip")
	if result.IP != "not-an-ip" {
		t.Errorf("IP mismatch: got %q", result.IP)
	}
	// Should handle gracefully
	if result.Duration < 0 {
		t.Error("Duration should be non-negative")
	}
}

func TestLookupDNS_MXRecordsHaveCorrectFormat(t *testing.T) {
	result := LookupDNS("gmail-smtp-in.l.google.com")
	for _, mx := range result.MX {
		if mx.Host == "" {
			t.Error("MX host should not be empty")
		}
		if mx.Priority == 0 {
			t.Error("MX priority should not be 0")
		}
	}
}

func TestLookupDNS_NSRecordsAreTrimmed(t *testing.T) {
	result := LookupDNS("google.com")
	for _, ns := range result.NS {
		if strings.HasSuffix(ns.Host, ".") {
			t.Errorf("NS host should have trailing dot trimmed: %q", ns.Host)
		}
	}
}

func TestLookupMX_IPsResolved(t *testing.T) {
	result := LookupMX("google.com")
	if len(result.MX) == 0 {
		t.Skip("No MX records to check")
	}
	// At least one MX should have resolved IPs
	hasIPs := false
	for _, mx := range result.MX {
		if len(mx.IPs) > 0 {
			hasIPs = true
			break
		}
	}
	if !hasIPs {
		t.Error("Expected at least one MX host to have resolved IPs")
	}
}
