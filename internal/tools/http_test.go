package tools

import (
	"testing"
	"time"
)

func TestInspectHTTPHeaders_ValidURL(t *testing.T) {
	result := InspectHTTPHeaders("https://example.com")

	if result.URL == "" {
		t.Error("expected URL to be set")
	}
	if result.StatusCode == 0 {
		t.Error("expected StatusCode to be set")
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestInspectHTTPHeaders_InvalidURL(t *testing.T) {
	result := InspectHTTPHeaders("not-a-valid-url")

	if result.Error == "" {
		t.Error("expected Error to be set for invalid URL")
	}
}

func TestInspectHTTPHeaders_NonExistentDomain(t *testing.T) {
	result := InspectHTTPHeaders("https://this-domain-definitely-does-not-exist-12345.invalid")

	if result.Error == "" {
		t.Error("expected Error to be set for non-existent domain")
	}
}

func TestInspectHTTPHeaders_TimeoutBehavior(t *testing.T) {
	start := time.Now()
	result := InspectHTTPHeaders("https://10.255.255.1") // Non-routable IP
	elapsed := time.Since(start)

	if elapsed > 30*time.Second {
		t.Errorf("expected test to complete within 30 seconds, took %v", elapsed)
	}
	if result.Duration > 30000 {
		t.Errorf("expected Duration to be under 30000ms, got %d", result.Duration)
	}
}

func TestInspectHTTPHeaders_ResponseFields(t *testing.T) {
	result := InspectHTTPHeaders("https://example.com")

	if result.StatusCode == 200 {
		// Verify that common fields are populated
		t.Logf("Server: %s, ContentType: %s, HSTS: %v",
			result.Server, result.ContentType, result.HSTS)
	}
}

func TestCheckDNSPropagation_ValidDomain(t *testing.T) {
	result := CheckDNSPropagation("example.com")

	if result.Domain != "example.com" {
		t.Errorf("expected Domain to be 'example.com', got %q", result.Domain)
	}
	if len(result.Servers) == 0 {
		t.Error("expected Servers to be non-empty")
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestCheckDNSPropagation_NonExistentDomain(t *testing.T) {
	result := CheckDNSPropagation("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
}

func TestCheckDNSPropagation_Duration(t *testing.T) {
	start := time.Now()
	result := CheckDNSPropagation("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 60*time.Second {
		t.Errorf("expected test to complete within 60 seconds, took %v", elapsed)
	}
}
