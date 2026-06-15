package tools

import (
	"strings"
	"testing"
)

func TestExtractTLD_Simple(t *testing.T) {
	tests := []struct {
		domain   string
		expected string
	}{
		{"google.com", "com"},
		{"example.org", "org"},
		{"test.net", "net"},
		{"example.de", "de"},
		// Turkish second-level domains: TLD is "tr"
		{"example.com.tr", "tr"},
		{"example.net.tr", "tr"},
		{"dgn.net.tr", "tr"},
		{"example.org.tr", "tr"},
		// Other compound TLDs: return full compound suffix
		{"example.co.uk", "co.uk"},
		{"example.co.jp", "co.jp"},
		{"example.com.au", "com.au"},
		{"example.org.uk", "org.uk"},
		{"example.net.nz", "net.nz"},
		{"example.co.za", "co.za"},
	}

	for _, tt := range tests {
		result := extractTLD(tt.domain)
		if result != tt.expected {
			t.Errorf("extractTLD(%q) = %q, want %q", tt.domain, result, tt.expected)
		}
	}
}

func TestExtractTLD_WithTrailingDot(t *testing.T) {
	result := extractTLD("google.com.")
	if result != "com" {
		t.Errorf("extractTLD(\"google.com.\") = %q, want \"com\"", result)
	}
}

func TestExtractTLD_SingleLabel(t *testing.T) {
	result := extractTLD("localhost")
	if result != "localhost" {
		t.Errorf("extractTLD(\"localhost\") = %q, want \"localhost\"", result)
	}
}

func TestExtractTLD_CaseInsensitive(t *testing.T) {
	tests := []struct {
		domain   string
		expected string
	}{
		{"GOOGLE.COM", "com"},
		{"Example.ORG", "org"},
		{"TEST.Net", "net"},
	}

	for _, tt := range tests {
		result := extractTLD(tt.domain)
		if result != tt.expected {
			t.Errorf("extractTLD(%q) = %q, want %q", tt.domain, result, tt.expected)
		}
	}
}

func TestExtractSLD(t *testing.T) {
	tests := []struct {
		domain   string
		expected string
	}{
		// Turkish second-level domains
		{"dgn.net.tr", "net.tr"},
		{"example.com.tr", "com.tr"},
		{"example.org.tr", "org.tr"},
		{"example.gov.tr", "gov.tr"},
		// Non-Turkish compound TLDs return empty
		{"example.co.uk", ""},
		{"example.co.jp", ""},
		{"example.com.au", ""},
		// Simple TLDs return empty
		{"google.com", ""},
		{"example.org", ""},
		{"test.net", ""},
		// Single label
		{"localhost", ""},
	}

	for _, tt := range tests {
		result := extractSLD(tt.domain)
		if result != tt.expected {
			t.Errorf("extractSLD(%q) = %q, want %q", tt.domain, result, tt.expected)
		}
	}
}

func TestParseWhoisField(t *testing.T) {
	tests := []struct {
		line     string
		prefixes []string
		expected string
	}{
		{"Registrar: GoDaddy.com, LLC", []string{"registrar:"}, "GoDaddy.com, LLC"},
		{"Creation Date: 2020-01-15", []string{"creation date:", "created:"}, "2020-01-15"},
		{"created: 2020-01-15", []string{"creation date:", "created:"}, "2020-01-15"},
		{"  Registrar:  Name.com", []string{"registrar:"}, "Name.com"},
		{"Name Server: ns1.example.com", []string{"name server:", "nserver:"}, "ns1.example.com"},
		{"nserver: ns1.example.com", []string{"name server:", "nserver:"}, "ns1.example.com"},
		{"Some Random: Value", []string{"registrar:"}, ""}, // No match
		{"", []string{"registrar:"}, ""},                   // Empty line
		// TRABIS dot-padded format
		{"Created on..............: 2007-Jan-08.", []string{"created on.", "created on:"}, "2007-Jan-08"},
		{"Expires on..............: 2027-Jan-07.", []string{"expires on.", "expires on:"}, "2027-Jan-07"},
		{"Last Update Time: 2026-06-15T10:46:52+03:00", []string{"last update time:", "last update time."}, "2026-06-15T10:46:52+03:00"},
		// TRABIS trailing period in value
		{"Created on..............: 2007-Jan-08.", []string{"created on."}, "2007-Jan-08"},
		{"Expires on..............: 2027-Jan-07.", []string{"expires on."}, "2027-Jan-07"},
		// Standard formats should still work
		{"Created on: 2020-01-15", []string{"created on:"}, "2020-01-15"},
		{"Expires on: 2027-01-07", []string{"expires on:"}, "2027-01-07"},
		{"Expiration Date: 2027-01-07", []string{"expiration date:"}, "2027-01-07"},
		// Mixed case TRABIS
		{"Created on..............: 2007-Jan-08.", []string{"Created on."}, "2007-Jan-08"},
	}

	for _, tt := range tests {
		result := parseWhoisField(tt.line, tt.prefixes...)
		if result != tt.expected {
			t.Errorf("parseWhoisField(%q, %v) = %q, want %q",
				tt.line, tt.prefixes, result, tt.expected)
		}
	}
}

func TestParseWhoisField_CaseInsensitive(t *testing.T) {
	result := parseWhoisField("REGISTRAR: Example Inc", "registrar:")
	if result != "Example Inc" {
		t.Errorf("Expected case-insensitive match, got %q", result)
	}
}

func TestGetWhoisServer_KnownTLDs(t *testing.T) {
	tests := []struct {
		domain   string
		expected string
	}{
		{"google.com", "whois.verisign-grs.com"},
		{"example.org", "whois.pir.org"},
		{"test.de", "whois.denic.de"},
		{"example.uk", "whois.nic.uk"},
		{"test.tr", "whois.trabis.gov.tr"},
	}

	for _, tt := range tests {
		result := getWhoisServer(tt.domain)
		if result != tt.expected {
			t.Errorf("getWhoisServer(%q) = %q, want %q", tt.domain, result, tt.expected)
		}
	}
}

func TestCheckWhois_ResultStructure(t *testing.T) {
	result := CheckWhois("this-domain-does-not-exist-xyz123.example", false)
	if result.Domain != "this-domain-does-not-exist-xyz123.example" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
	if result.NameServers == nil {
		t.Error("NameServers should not be nil")
	}
	if result.Details == nil {
		t.Error("Details should not be nil")
	}
}

func TestCheckWhois_Duration(t *testing.T) {
	result := CheckWhois("example.com", false)
	if result.Duration <= 0 {
		t.Errorf("Duration should be positive, got %d", result.Duration)
	}
}

func TestCheckWhois_ServerField(t *testing.T) {
	result := CheckWhois("example.com", false)
	if result.Server == "" {
		t.Error("Server should not be empty")
	}
}

func TestCheckWhois_WithRefresh(t *testing.T) {
	// Force refresh to bypass cache
	result := CheckWhois("example.com", true)
	if result.Domain != "example.com" {
		t.Errorf("Domain mismatch: got %q", result.Domain)
	}
}

func TestCheckWhois_CacheHit(t *testing.T) {
	domain := "cache-test-" + t.Name() + ".example"
	// First call - cache miss
	result1 := CheckWhois(domain, false)
	// Second call - should hit cache
	result2 := CheckWhois(domain, false)
	// Both should have the same domain
	if result1.Domain != result2.Domain {
		t.Errorf("Domain mismatch between calls: %q vs %q", result1.Domain, result2.Domain)
	}
}

func TestValidateDomain_ValidDomains(t *testing.T) {
	valid := []string{
		"example.com",
		"sub.example.com",
		"example.co.uk",
		"test123.org",
		"my-domain.net",
	}
	for _, d := range valid {
		if err := ValidateDomain(d); err != nil {
			t.Errorf("ValidateDomain(%q) failed: %v", d, err)
		}
	}
}

func TestValidateDomain_InvalidDomains(t *testing.T) {
	invalid := []string{
		"",
		"nodomain",
		"invalid..com",
		"-starts-withdash.com",
		"ends-with-dash-.",
		strings.Repeat("a", 64) + ".com", // label too long
	}
	for _, d := range invalid {
		if err := ValidateDomain(d); err == nil {
			t.Errorf("ValidateDomain(%q) should fail but passed", d)
		}
	}
}

func TestValidateDomain_WithURL(t *testing.T) {
	if err := ValidateDomain("https://example.com"); err != nil {
		t.Errorf("ValidateDomain should strip https://: %v", err)
	}
	if err := ValidateDomain("http://example.com:8080/path"); err != nil {
		t.Errorf("ValidateDomain should strip port and path: %v", err)
	}
}
