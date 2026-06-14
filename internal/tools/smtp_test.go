package tools

import (
	"testing"
	"time"
)

func TestTestSMTP_ResultStructure(t *testing.T) {
	result := TestSMTP("smtp.example.com", 25)

	if result.Host != "smtp.example.com" {
		t.Errorf("expected Host to be 'smtp.example.com', got %q", result.Host)
	}
	if result.Port != 25 {
		t.Errorf("expected Port to be 25, got %d", result.Port)
	}
	if result.AuthMethods == nil {
		t.Error("expected AuthMethods to be initialized (non-nil slice)")
	}
	if result.Connected && result.Error != "" {
		t.Error("if Connected is true, Error should be empty")
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestTestSMTP_ZeroPort(t *testing.T) {
	result := TestSMTP("smtp.example.com", 0)

	if result.Port != 25 {
		t.Errorf("expected Port to default to 25 when 0 is passed, got %d", result.Port)
	}
}

func TestTestSMTP_ConnectionFailure(t *testing.T) {
	result := TestSMTP("this-domain-does-not-exist-12345.invalid", 25)

	if result.Connected {
		t.Error("expected Connected to be false for non-existent domain")
	}
	if result.Error == "" {
		t.Error("expected Error to be set for non-existent domain")
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestTestSMTP_AuthMethodsInitialized(t *testing.T) {
	result := TestSMTP("smtp.example.com", 25)

	if result.AuthMethods == nil {
		t.Error("AuthMethods slice should be initialized, not nil")
	}
}

func TestTestSMTP_TimeoutBehavior(t *testing.T) {
	start := time.Now()
	result := TestSMTP("10.255.255.1", 25) // Non-routable IP should timeout
	elapsed := time.Since(start)

	if elapsed > 20*time.Second {
		t.Errorf("expected test to complete within 20 seconds, took %v", elapsed)
	}
	if result.Duration > 20000 {
		t.Errorf("expected Duration to be under 20000ms, got %d", result.Duration)
	}
}

func TestTestSMTP_STARTTLSField(t *testing.T) {
	result := TestSMTP("smtp.example.com", 25)

	// STARTTLS should be either true or false
	// This test just verifies the field is populated
	if !result.Connected && result.STARTTLS {
		t.Error("STARTTLS cannot be true if not connected")
	}
}
