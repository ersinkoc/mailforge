package tools

import (
	"strings"
	"testing"
)

func TestParseDMARCRecord_Basic(t *testing.T) {
	record := "v=DMARC1; p=reject; rua=mailto:d@example.com"
	pairs := parseDMARCRecord(record)

	if pairs["v"] != "DMARC1" {
		t.Errorf("Expected v=DMARC1, got %q", pairs["v"])
	}
	if pairs["p"] != "reject" {
		t.Errorf("Expected p=reject, got %q", pairs["p"])
	}
	if pairs["rua"] != "mailto:d@example.com" {
		t.Errorf("Expected rua=mailto:d@example.com, got %q", pairs["rua"])
	}
}

func TestParseDMARCRecord_AllTags(t *testing.T) {
	record := "v=DMARC1; p=quarantine; sp=none; pct=50; rua=mailto:a@b.com; ruf=mailto:f@b.com; adkim=s; aspf=r; fo=1; ri=86400"
	pairs := parseDMARCRecord(record)

	if pairs["p"] != "quarantine" {
		t.Errorf("Expected p=quarantine, got %q", pairs["p"])
	}
	if pairs["sp"] != "none" {
		t.Errorf("Expected sp=none, got %q", pairs["sp"])
	}
	if pairs["pct"] != "50" {
		t.Errorf("Expected pct=50, got %q", pairs["pct"])
	}
	if pairs["adkim"] != "s" {
		t.Errorf("Expected adkim=s, got %q", pairs["adkim"])
	}
	if pairs["aspf"] != "r" {
		t.Errorf("Expected aspf=r, got %q", pairs["aspf"])
	}
	if pairs["fo"] != "1" {
		t.Errorf("Expected fo=1, got %q", pairs["fo"])
	}
	if pairs["ri"] != "86400" {
		t.Errorf("Expected ri=86400, got %q", pairs["ri"])
	}
}

func TestParseDMARCRecord_EmptyParts(t *testing.T) {
	record := "v=DMARC1; ; p=reject; ;"
	pairs := parseDMARCRecord(record)

	if len(pairs) != 2 {
		t.Errorf("Expected 2 pairs, got %d", len(pairs))
	}
}

func TestCheckDMARC_NonExistentDomain(t *testing.T) {
	result := CheckDMARC("this-domain-does-not-exist-xyz123.example")
	if result.Error == "" {
		t.Error("Expected error for non-existent domain")
	}
	if result.Duration <= 0 {
		t.Error("Expected positive duration")
	}
}

func TestCheckDMARC_ResultStructure(t *testing.T) {
	result := CheckDMARC("this-domain-does-not-exist-xyz123.example")
	if result.Domain != "this-domain-does-not-exist-xyz123.example" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	if result.Warnings == nil {
		t.Error("Warnings should not be nil")
	}
	if result.Errors == nil {
		t.Error("Errors should not be nil")
	}
	if result.Aggregate == nil {
		t.Error("Aggregate should not be nil")
	}
	if result.Forensic == nil {
		t.Error("Forensic should not be nil")
	}
}

func TestCheckDMARC_NoDMARCRecord(t *testing.T) {
	// google.com has DMARC, but a random domain likely won't
	result := CheckDMARC("this-domain-does-not-exist-xyz123.example")
	if result.Valid {
		t.Error("Expected Invalid=false for non-existent domain")
	}
}

func TestParseDMARCRecord_CaseInsensitive(t *testing.T) {
	// The parser should handle case in keys
	record := "V=DMARC1; P=reject"
	pairs := parseDMARCRecord(record)

	// parseDMARCRecord uses the raw key, so V and P are stored as-is
	if pairs["V"] != "DMARC1" {
		t.Errorf("Expected V=DMARC1, got %q", pairs["V"])
	}
	if pairs["P"] != "reject" {
		t.Errorf("Expected P=reject, got %q", pairs["P"])
	}
}

func TestCheckDMARC_Warnings(t *testing.T) {
	// Test that policy=none generates a warning
	// We can't easily test this without mocking DNS, but we can verify
	// the warning logic by checking the result structure
	result := CheckDMARC("this-domain-does-not-exist-xyz123.example")
	// The result should have warnings/errors populated
	if result.Warnings == nil {
		t.Error("Warnings slice should be initialized")
	}
}

func TestCheckDMARC_Duration(t *testing.T) {
	result := CheckDMARC("this-domain-does-not-exist-xyz123.example")
	if result.Duration < 0 {
		t.Errorf("Duration should be non-negative, got %d", result.Duration)
	}
}

func TestParseDMARCRecord_SingleTag(t *testing.T) {
	record := "v=DMARC1"
	pairs := parseDMARCRecord(record)

	if len(pairs) != 1 {
		t.Errorf("Expected 1 pair, got %d", len(pairs))
	}
	if pairs["v"] != "DMARC1" {
		t.Errorf("Expected v=DMARC1, got %q", pairs["v"])
	}
}

func TestCheckDMARC_InvalidDomain(t *testing.T) {
	result := CheckDMARC("not-a-valid-domain")
	// Should return an error, not panic
	if result.Error == "" && len(result.Errors) == 0 {
		t.Error("Expected error for invalid domain")
	}
}

func TestCheckDMARC_DomainField(t *testing.T) {
	domain := "test-domain.example"
	result := CheckDMARC(domain)
	if !strings.Contains(result.Domain, "test-domain") {
		t.Errorf("Domain should contain input domain, got %q", result.Domain)
	}
}
