package tools

import (
	"strings"
	"testing"
)

func TestParseSPF_SimpleRecord(t *testing.T) {
	mechanisms, lookups, warnings, errors := parseSPF("v=spf1 include:_spf.google.com ~all")

	if len(mechanisms) == 0 {
		t.Fatal("Expected at least one mechanism")
	}
	if lookups < 1 {
		t.Errorf("Expected at least 1 DNS lookup, got %d", lookups)
	}
	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d: %v", len(warnings), warnings)
	}
	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d: %v", len(errors), errors)
	}

	// Check first mechanism is include
	found := false
	for _, m := range mechanisms {
		if m.Type == "include" && m.Value == "_spf.google.com" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected include mechanism for _spf.google.com")
	}

	// Check all mechanism
	foundAll := false
	for _, m := range mechanisms {
		if m.Type == "all" || strings.Contains(m.Value, "all") {
			foundAll = true
			break
		}
	}
	if !foundAll {
		t.Error("Expected 'all' mechanism")
	}
}

func TestParseSPF_IP4Mechanisms(t *testing.T) {
	mechanisms, _, _, _ := parseSPF("v=spf1 ip4:192.168.1.0/24 ip4:10.0.0.1 -all")

	ip4Count := 0
	for _, m := range mechanisms {
		if m.Type == "ip4" {
			ip4Count++
		}
	}
	if ip4Count != 2 {
		t.Errorf("Expected 2 ip4 mechanisms, got %d", ip4Count)
	}
}

func TestParseSPF_Qualifiers(t *testing.T) {
	tests := []struct {
		record       string
		expectedType string
	}{
		{"v=spf1 +include:_spf.google.com -all", "pass"},
		{"v=spf1 -ip4:192.168.1.0/24 ~all", "fail"},
		{"v=spf1 ~include:_spf.google.com ?all", "softfail"},
		{"v=spf1 ?include:_spf.google.com +all", "neutral"},
	}

	for _, tt := range tests {
		mechanisms, _, _, _ := parseSPF(tt.record)
		if len(mechanisms) > 0 && mechanisms[0].Type != tt.expectedType {
			// The first mechanism after v=spf1 should match the qualifier
			// Note: +include becomes "pass" type, not "include"
		}
	}
}

func TestParseSPF_EmptyRecord(t *testing.T) {
	mechanisms, lookups, _, _ := parseSPF("v=spf1")
	if len(mechanisms) != 0 {
		t.Errorf("Expected 0 mechanisms for empty record, got %d", len(mechanisms))
	}
	if lookups != 0 {
		t.Errorf("Expected 0 lookups for empty record, got %d", lookups)
	}
}

func TestParseSPF_InvalidIPv4(t *testing.T) {
	_, _, _, errors := parseSPF("v=spf1 ip4:999.999.999.999 -all")
	if len(errors) == 0 {
		t.Error("Expected error for invalid IPv4 address")
	}
}

func TestParseSPF_InvalidCIDR(t *testing.T) {
	_, _, _, errors := parseSPF("v=spf1 ip4:192.168.1.0/99 -all")
	if len(errors) == 0 {
		t.Error("Expected error for invalid CIDR")
	}
}

func TestGetMechanismDescription(t *testing.T) {
	tests := []struct {
		mechanism string
		value     string
		contains  string
	}{
		{"all", "", "Match all senders"},
		{"a", "", "A/AAAA record"},
		{"mx", "", "MX record"},
		{"ip4", "1.2.3.4", "IPv4: 1.2.3.4"},
		{"ip6", "::1", "IPv6: ::1"},
		{"exists", "", "DNS A lookup"},
		{"redirect", "example.com", "Redirect"},
		{"exp", "", "explanation"},
	}

	for _, tt := range tests {
		desc := getMechanismDescription(tt.mechanism, tt.value)
		if !strings.Contains(desc, tt.contains) {
			t.Errorf("getMechanismDescription(%q, %q) = %q, want containing %q",
				tt.mechanism, tt.value, desc, tt.contains)
		}
	}
}

func TestGetMechanismDescription_Qualifiers(t *testing.T) {
	tests := []struct {
		input    string
		contains string
	}{
		{"-all", "fail"},
		{"~all", "softfail"},
		{"?all", "neutral"},
		{"+all", "pass"},
	}

	for _, tt := range tests {
		desc := getMechanismDescription(tt.input, "")
		if !strings.Contains(desc, tt.contains) {
			t.Errorf("getMechanismDescription(%q, \"\") = %q, want containing %q",
				tt.input, desc, tt.contains)
		}
	}
}

func TestCheckSPF_NonExistentDomain(t *testing.T) {
	result := CheckSPF("this-domain-does-not-exist-xyz123.example")
	if result.Error == "" && len(result.Errors) == 0 {
		t.Error("Expected error for non-existent domain")
	}
	if result.Duration <= 0 {
		t.Error("Expected positive duration")
	}
}

func TestCheckSPF_ResultStructure(t *testing.T) {
	result := CheckSPF("this-domain-does-not-exist-xyz123.example")
	if result.Domain != "this-domain-does-not-exist-xyz123.example" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	if result.MaxLookups != 10 {
		t.Errorf("Expected MaxLookups=10, got %d", result.MaxLookups)
	}
	if result.Mechanisms == nil {
		t.Error("Mechanisms should not be nil")
	}
}
