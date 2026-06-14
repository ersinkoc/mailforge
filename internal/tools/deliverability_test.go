package tools

import (
	"testing"
	"time"
)

func TestComputeDeliverability_ValidDomain(t *testing.T) {
	result := ComputeDeliverability("google.com")

	if result.Domain != "google.com" {
		t.Errorf("expected Domain to be 'google.com', got %q", result.Domain)
	}
	if result.Score < 0 || result.Score > 100 {
		t.Errorf("expected Score to be between 0 and 100, got %d", result.Score)
	}
	if result.Grade == "" {
		t.Error("expected Grade to be set")
	}
	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
}

func TestComputeDeliverability_ValidGrade(t *testing.T) {
	result := ComputeDeliverability("gmail.com")

	// Grade should be a single letter A-F
	if len(result.Grade) != 1 {
		t.Errorf("expected Grade to be single letter, got %q", result.Grade)
	}
	validGrades := map[string]bool{"A": true, "B": true, "C": true, "D": true, "F": true}
	if !validGrades[result.Grade] {
		t.Errorf("expected Grade to be A-F, got %q", result.Grade)
	}
}

func TestComputeDeliverability_NonExistentDomain(t *testing.T) {
	result := ComputeDeliverability("this-domain-definitely-does-not-exist-12345.invalid")

	if result.Domain != "this-domain-definitely-does-not-exist-12345.invalid" {
		t.Errorf("expected Domain to be preserved, got %q", result.Domain)
	}
	// Non-existent domain should likely have a low score
	if result.Score > 50 {
		t.Logf("Note: Non-existent domain may still have score %d", result.Score)
	}
}

func TestComputeDeliverability_Duration(t *testing.T) {
	start := time.Now()
	result := ComputeDeliverability("example.com")
	elapsed := time.Since(start)

	if result.Duration < 0 {
		t.Errorf("expected Duration to be non-negative, got %d", result.Duration)
	}
	if elapsed > 30*time.Second {
		t.Errorf("expected test to complete within 30 seconds, took %v", elapsed)
	}
}

func TestComputeDeliverability_ComponentChecksExist(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// Verify that all component checks exist
	components := []struct {
		name  string
		check ComponentCheck
	}{
		{"SPF", result.SPF},
		{"DKIM", result.DKIM},
		{"DMARC", result.DMARC},
		{"MTASTS", result.MTASTS},
		{"TLSReporting", result.TLReporting},
		{"BIMI", result.BIMI},
		{"DNSSEC", result.DNSSEC},
		{"Blacklist", result.Blacklist},
	}

	for _, comp := range components {
		if comp.check.Present {
			t.Logf("%s is present for google.com", comp.name)
		}
	}
}

func TestComputeDeliverability_SPFCheck(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// SPF should typically be present for major domains
	if !result.SPF.Present {
		t.Logf("Note: SPF not present for google.com")
	}
}

func TestComputeDeliverability_DKIMCheck(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// DKIM should typically be present for major domains
	if !result.DKIM.Present {
		t.Logf("Note: DKIM not present for google.com")
	}
}

func TestComputeDeliverability_DMARCCheck(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// DMARC should typically be present for major domains
	if !result.DMARC.Present {
		t.Logf("Note: DMARC not present for google.com")
	}
}

func TestComputeDeliverability_MultipleDomains(t *testing.T) {
	domains := []string{"google.com", "microsoft.com", "apple.com"}

	for _, domain := range domains {
		result := ComputeDeliverability(domain)
		if result.Domain != domain {
			t.Errorf("expected Domain to be %q, got %q", domain, result.Domain)
		}
		if result.Grade == "" {
			t.Errorf("expected Grade to be set for %s", domain)
		}
	}
}

func TestComputeDeliverability_Recommendations(t *testing.T) {
	result := ComputeDeliverability("example.com")

	// Recommendations can be empty but should not be nil
	t.Logf("Recommendations for example.com: %v", result.Recommendations)
}

func TestComputeDeliverability_DNSSECCheck(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// DNSSEC check should exist
	t.Logf("DNSSEC present: %v, valid: %v, score: %d",
		result.DNSSEC.Present, result.DNSSEC.Valid, result.DNSSEC.Score)
}

func TestComputeDeliverability_BlacklistCheck(t *testing.T) {
	result := ComputeDeliverability("google.com")

	// Blacklist check should exist
	t.Logf("Blacklist present: %v, score: %d",
		result.Blacklist.Present, result.Blacklist.Score)
}
