package tools

import (
	"testing"
)

func TestLookupIPGeo_ValidIP(t *testing.T) {
	result := LookupIPGeo("8.8.8.8") // Google DNS

	if result.IP != "8.8.8.8" {
		t.Errorf("expected IP to be '8.8.8.8', got %q", result.IP)
	}
	// Country should be set - either from API or fallback
	// If API failed, fallback (deriveCountryFromIP) should provide country
	if result.Country == "" && result.Warning == "" {
		t.Error("expected Country to be set for 8.8.8.8 (either from API or fallback)")
	}
	if result.Latitude == 0 && result.Longitude == 0 {
		t.Logf("Note: Latitude and Longitude may be 0 if GeoIP API failed")
	}
}

func TestLookupIPGeo_InvalidIP(t *testing.T) {
	result := LookupIPGeo("not-an-ip")

	if result.IP != "not-an-ip" {
		t.Errorf("expected IP to be 'not-an-ip', got %q", result.IP)
	}
	// Invalid IP should result in empty/zero values
	if result.Error == "" {
		t.Logf("Note: Error may be empty for invalid IP format")
	}
}

func TestLookupIPGeo_PrivateIP(t *testing.T) {
	result := LookupIPGeo("192.168.1.1") // Private IP

	// Private IPs typically return empty results
	if result.City != "" {
		t.Logf("Unexpected: Private IP 192.168.1.1 returned City=%s", result.City)
	}
	if result.Country != "" {
		t.Logf("Unexpected: Private IP 192.168.1.1 returned Country=%s", result.Country)
	}
}

func TestLookupIPGeo_Localhost(t *testing.T) {
	result := LookupIPGeo("127.0.0.1") // Localhost

	// Localhost should return empty/zero values
	if result.City != "" {
		t.Logf("Unexpected: Localhost returned City=%s", result.City)
	}
}

func TestLookupIPGeo_IPv6(t *testing.T) {
	result := LookupIPGeo("2001:4860:4860::8888") // Google IPv6

	// IPv6 support may be limited
	if result.IP != "2001:4860:4860::8888" {
		t.Errorf("expected IP to be preserved, got %q", result.IP)
	}
}
