package tools

import (
	"testing"
	"time"
)

func TestInspectTLS_ResultStructure(t *testing.T) {
	result := InspectTLS("smtp.gmail.com", 465)

	if result.Host != "smtp.gmail.com" {
		t.Errorf("expected Host to be 'smtp.gmail.com', got %q", result.Host)
	}
	if result.Port != 465 {
		t.Errorf("expected Port to be 465, got %d", result.Port)
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestInspectTLS_ConnectionFailure(t *testing.T) {
	result := InspectTLS("this-domain-does-not-exist-12345.invalid", 465)

	if result.Error == "" {
		t.Error("expected Error to be set for non-existent domain")
	}
}

func TestInspectTLS_ZeroPort(t *testing.T) {
	result := InspectTLS("smtp.example.com", 0)

	// Port 0 should default to 465 or be handled gracefully
	t.Logf("Result: Host=%s Port=%d Error=%v", result.Host, result.Port, result.Error)
}

func TestInspectTLS_TimeoutBehavior(t *testing.T) {
	start := time.Now()
	// Non-routable IP should timeout
	result := InspectTLS("10.255.255.1", 465)
	elapsed := time.Since(start)

	if elapsed > 20*time.Second {
		t.Errorf("expected test to complete within 20 seconds, took %v", elapsed)
	}
	if result.Duration > 20000 {
		t.Errorf("expected Duration to be under 20000ms, got %d", result.Duration)
	}
}

func TestInspectTLS_ValidConnection(t *testing.T) {
	// Test with gmail's SMTP server which supports TLS
	result := InspectTLS("smtp.gmail.com", 465)

	if result.Host != "smtp.gmail.com" {
		t.Errorf("expected Host to be 'smtp.gmail.com', got %q", result.Host)
	}
}

func TestInspectTLS_STARTTLSPort(t *testing.T) {
	// Port 587 typically uses STARTTLS
	result := InspectTLS("smtp.gmail.com", 587)

	// We expect either a successful TLS or graceful error
	t.Logf("Result: Host=%s Port=%d Error=%v", result.Host, result.Port, result.Error)
}
