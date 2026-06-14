package tools

import (
	"testing"
)

func TestParseDKIMRecord(t *testing.T) {
	record := "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7GB..."
	pairs := parseDKIMRecord(record)

	if pairs["v"] != "DKIM1" {
		t.Errorf("Expected v=DKIM1, got %q", pairs["v"])
	}
	if pairs["k"] != "rsa" {
		t.Errorf("Expected k=rsa, got %q", pairs["k"])
	}
	if pairs["p"] == "" {
		t.Error("Expected non-empty public key")
	}
}

func TestParseDKIMRecord_WithFlags(t *testing.T) {
	record := "v=DKIM1; k=ed25519; t=y; s=email; n=test note; p=abc123"
	pairs := parseDKIMRecord(record)

	if pairs["t"] != "y" {
		t.Errorf("Expected t=y, got %q", pairs["t"])
	}
	if pairs["s"] != "email" {
		t.Errorf("Expected s=email, got %q", pairs["s"])
	}
	if pairs["n"] != "test note" {
		t.Errorf("Expected n=test note, got %q", pairs["n"])
	}
}

func TestParseDKIMRecord_EmptyParts(t *testing.T) {
	record := "v=DKIM1; ; ; k=rsa; p=abc"
	pairs := parseDKIMRecord(record)

	if len(pairs) != 3 {
		t.Errorf("Expected 3 pairs (v, k, p), got %d", len(pairs))
	}
}

func TestEstimateKeySize(t *testing.T) {
	tests := []struct {
		key      string
		expected int
	}{
		{"shortkey", 1024},         // < 200 chars
		{string(make([]byte, 150)), 1024},  // < 200 chars
		{string(make([]byte, 250)), 2048},  // 200-400 chars
		{string(make([]byte, 350)), 2048},  // 200-400 chars
		{string(make([]byte, 500)), 4096},  // > 400 chars
		{string(make([]byte, 1000)), 4096}, // > 400 chars
	}

	for _, tt := range tests {
		result := estimateKeySize(tt.key)
		if result != tt.expected {
			t.Errorf("estimateKeySize(len=%d) = %d, want %d", len(tt.key), result, tt.expected)
		}
	}
}

func TestCheckDKIM_NonExistentDomain(t *testing.T) {
	result := CheckDKIM("this-domain-does-not-exist-xyz123.example", "default")
	if result.Error == "" {
		t.Error("Expected error for non-existent domain")
	}
	if result.Duration <= 0 {
		t.Error("Expected positive duration")
	}
	if result.Selector != "default" {
		t.Errorf("Expected selector 'default', got %q", result.Selector)
	}
}

func TestCheckDKIM_EmptySelector(t *testing.T) {
	result := CheckDKIM("example.com", "")
	if result.Selector != "default" {
		t.Errorf("Expected default selector, got %q", result.Selector)
	}
}

func TestCheckDKIM_ResultStructure(t *testing.T) {
	result := CheckDKIM("example.com", "google")
	if result.Domain != "example.com" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	if result.Selector != "google" {
		t.Errorf("Selector mismatch: got %q", result.Selector)
	}
}

func TestCheckDKIM_InvalidDomain(t *testing.T) {
	result := CheckDKIM("not-a-valid-domain", "default")
	if result.Error == "" {
		t.Error("Expected error for invalid domain")
	}
}
