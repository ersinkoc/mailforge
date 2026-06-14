package tools

import (
	"testing"
	"time"
)

func TestCheckDNSSEC_ValidDomain(t *testing.T) {
	result := CheckDNSSEC("example.com")

	if result.Domain != "example.com" {
		t.Errorf("expected Domain to be 'example.com', got %q", result.Domain)
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestCheckDNSSEC_NonExistentDomain(t *testing.T) {
	result := CheckDNSSEC("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
	if result.Error == "" {
		t.Logf("Note: Error may be empty for some non-existent domains")
	}
}

func TestCheckDNSSEC_Duration(t *testing.T) {
	start := time.Now()
	result := CheckDNSSEC("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 10*time.Second {
		t.Errorf("expected test to complete within 10 seconds, took %v", elapsed)
	}
}

func TestCheckMTASTS_ValidDomain(t *testing.T) {
	result := CheckMTASTS("google.com")

	if result.Domain != "google.com" {
		t.Errorf("expected Domain to be 'google.com', got %q", result.Domain)
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestCheckMTASTS_NonExistentDomain(t *testing.T) {
	result := CheckMTASTS("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
}

func TestCheckMTASTS_Duration(t *testing.T) {
	start := time.Now()
	result := CheckMTASTS("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 10*time.Second {
		t.Errorf("expected test to complete within 10 seconds, took %v", elapsed)
	}
}

func TestCheckTLSRPT_ValidDomain(t *testing.T) {
	result := CheckTLSRPT("google.com")

	if result.Domain != "google.com" {
		t.Errorf("expected Domain to be 'google.com', got %q", result.Domain)
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestCheckTLSRPT_NonExistentDomain(t *testing.T) {
	result := CheckTLSRPT("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
}

func TestCheckTLSRPT_Duration(t *testing.T) {
	start := time.Now()
	result := CheckTLSRPT("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 10*time.Second {
		t.Errorf("expected test to complete within 10 seconds, took %v", elapsed)
	}
}

func TestCheckBIMI_ValidDomain(t *testing.T) {
	result := CheckBIMI("google.com")

	if result.Domain != "google.com" {
		t.Errorf("expected Domain to be 'google.com', got %q", result.Domain)
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestCheckBIMI_NonExistentDomain(t *testing.T) {
	result := CheckBIMI("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
}

func TestCheckBIMI_Duration(t *testing.T) {
	start := time.Now()
	result := CheckBIMI("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 10*time.Second {
		t.Errorf("expected test to complete within 10 seconds, took %v", elapsed)
	}
}
