package tools

import (
	"strings"
	"testing"
)

func TestAnalyzeHeader_EmptyHeader(t *testing.T) {
	result := AnalyzeHeader("")
	if result.Error == "" {
		t.Error("Expected error for empty header")
	}
	if !strings.Contains(result.Error, "No email header") {
		t.Errorf("Expected 'No email header' error, got: %s", result.Error)
	}
}

func TestAnalyzeHeader_WhitespaceOnly(t *testing.T) {
	result := AnalyzeHeader("   \n  \t  ")
	if result.Error == "" {
		t.Error("Expected error for whitespace-only header")
	}
}

func TestAnalyzeHeader_BasicFields(t *testing.T) {
	header := "From: sender@example.com\nTo: recipient@example.com\nSubject: Test Email\nDate: Mon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if result.From != "sender@example.com" {
		t.Errorf("From mismatch: got %q", result.From)
	}
	if result.To != "recipient@example.com" {
		t.Errorf("To mismatch: got %q", result.To)
	}
	if result.Subject != "Test Email" {
		t.Errorf("Subject mismatch: got %q", result.Subject)
	}
	if result.Date != "Mon, 1 Jan 2024 12:00:00 +0000" {
		t.Errorf("Date mismatch: got %q", result.Date)
	}
}

func TestAnalyzeHeader_MessageID(t *testing.T) {
	header := "Message-ID: <abc123@example.com>"
	result := AnalyzeHeader(header)
	if result.MessageID != "<abc123@example.com>" {
		t.Errorf("MessageID mismatch: got %q", result.MessageID)
	}
}

func TestAnalyzeHeader_Headers(t *testing.T) {
	header := "From: a@b.com\nX-Custom: custom-value\nX-Another: another-value"
	result := AnalyzeHeader(header)

	if len(result.Headers) != 3 {
		t.Errorf("Expected 3 headers, got %d", len(result.Headers))
	}
	if result.Headers["X-Custom"] != "custom-value" {
		t.Errorf("X-Custom mismatch: got %q", result.Headers["X-Custom"])
	}
	if result.Headers["X-Another"] != "another-value" {
		t.Errorf("X-Another mismatch: got %q", result.Headers["X-Another"])
	}
}

func TestAnalyzeHeader_MultilineHeader(t *testing.T) {
	header := "Received: from mail.example.com (mail.example.com [1.2.3.4])\n\tby mx.receiver.com with ESMTP id abc123\n\tfor <user@example.com>; Mon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Headers) < 1 {
		t.Fatal("Expected at least 1 header")
	}
	// The multiline Received header should be joined
	received := result.Headers["Received"]
	if !strings.Contains(received, "mail.example.com") {
		t.Errorf("Received header should contain mail.example.com, got: %s", received)
	}
}

func TestAnalyzeHeader_RoutingParsing(t *testing.T) {
	header := "Received: from mail.example.com (mail.example.com [1.2.3.4])\n\tby mx.receiver.com with ESMTP;\n\tMon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Routing) == 0 {
		t.Fatal("Expected at least 1 routing hop")
	}

	hop := result.Routing[0]
	if hop.From == "" {
		t.Error("Routing hop From should not be empty")
	}
	if hop.To == "" {
		t.Error("Routing hop To should not be empty")
	}
	if hop.Hop != 1 {
		t.Errorf("Expected hop 1, got %d", hop.Hop)
	}
}

func TestAnalyzeHeader_MultipleRoutingHops(t *testing.T) {
	header := "Received: from sender.example.com by intermediate.example.com with ESMTP;\n\tMon, 1 Jan 2024 12:00:00 +0000\nReceived: from intermediate.example.com by final.example.com with ESMTP;\n\tMon, 1 Jan 2024 12:01:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Routing) < 2 {
		t.Fatalf("Expected at least 2 routing hops, got %d", len(result.Routing))
	}

	// Routing is reversed (newest first in Received headers)
	if result.Routing[0].Hop != 1 {
		t.Errorf("First hop should be 1, got %d", result.Routing[0].Hop)
	}
}

func TestAnalyzeHeader_SPFFailWarning(t *testing.T) {
	header := "Received-SPF: fail (google.com: domain of sender@example.com does not designate 1.2.3.4 as permitted sender)"
	result := AnalyzeHeader(header)

	if len(result.Warnings) == 0 {
		t.Error("Expected warning for SPF fail")
	}
	found := false
	for _, w := range result.Warnings {
		if strings.Contains(w, "SPF") && strings.Contains(w, "FAIL") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected SPF fail warning, got warnings: %v", result.Warnings)
	}
}

func TestAnalyzeHeader_SPFSoftfailWarning(t *testing.T) {
	header := "Received-SPF: softfail (google.com: domain of sender@example.com does not designate 1.2.3.4 as permitted sender)"
	result := AnalyzeHeader(header)

	if len(result.Warnings) == 0 {
		t.Error("Expected warning for SPF softfail")
	}
	found := false
	for _, w := range result.Warnings {
		if strings.Contains(strings.ToLower(w), "softfail") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected SPF softfail warning, got warnings: %v", result.Warnings)
	}
}

func TestAnalyzeHeader_DKIMFailWarning(t *testing.T) {
	header := "DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=selector; b=fail"
	result := AnalyzeHeader(header)

	if len(result.Warnings) == 0 {
		t.Error("Expected warning for DKIM fail")
	}
	found := false
	for _, w := range result.Warnings {
		if strings.Contains(w, "DKIM") && strings.Contains(w, "FAIL") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected DKIM fail warning, got warnings: %v", result.Warnings)
	}
}

func TestAnalyzeHeader_NoAuthResults(t *testing.T) {
	header := "From: sender@example.com\nSubject: Test"
	result := AnalyzeHeader(header)

	if len(result.Warnings) == 0 {
		t.Error("Expected warning for missing auth results")
	}
	found := false
	for _, w := range result.Warnings {
		if strings.Contains(w, "No authentication results") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected 'No authentication results' warning, got warnings: %v", result.Warnings)
	}
}

func TestAnalyzeHeader_AuthenticationResults(t *testing.T) {
	header := "Authentication-Results: mx.example.com; spf=pass smtp.mailfrom=sender@example.com; dkim=pass header.d=example.com"
	result := AnalyzeHeader(header)

	if len(result.AuthResults) == 0 {
		t.Error("Expected auth results to be populated")
	}
}

func TestAnalyzeHeader_ARCAuthResults(t *testing.T) {
	header := "ARC-Authentication-Results: i=1; mx.example.com; spf=pass"
	result := AnalyzeHeader(header)

	if _, ok := result.AuthResults["ARC-Authentication-Results"]; !ok {
		t.Error("Expected ARC-Authentication-Results in auth results")
	}
}

func TestAnalyzeHeader_RoutingDate(t *testing.T) {
	header := "Received: from mail.example.com by mx.example.com; Mon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Routing) == 0 {
		t.Fatal("Expected routing hops")
	}
	if result.Routing[0].Date == "" {
		t.Error("Routing hop should have a date")
	}
}

func TestAnalyzeHeader_RoutingProtocol(t *testing.T) {
	header := "Received: from mail.example.com by mx.example.com with ESMTP; Mon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Routing) == 0 {
		t.Fatal("Expected routing hops")
	}
	if !strings.Contains(result.Routing[0].Delay, "ESMTP") {
		t.Errorf("Expected ESMTP in delay, got: %s", result.Routing[0].Delay)
	}
}

func TestAnalyzeHeader_IncompleteRoutingWarning(t *testing.T) {
	// A Received header without "from" or "by" should generate a warning
	header := "Received: ; Mon, 1 Jan 2024 12:00:00 +0000"
	result := AnalyzeHeader(header)

	if len(result.Routing) == 0 {
		t.Fatal("Expected routing hops")
	}
	// The hop should have empty From or To
	hop := result.Routing[0]
	if hop.From != "" && hop.To != "" {
		t.Error("Expected incomplete routing (empty From or To)")
	}
}

func TestAnalyzeHeader_CompleteEmail(t *testing.T) {
	header := `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test123@example.com>
Received: from mail.sender.com (mail.sender.com [1.2.3.4])
	by mx.receiver.com with ESMTP;
	Mon, 1 Jan 2024 12:00:00 +0000
Received-SPF: pass (google.com: domain of sender@example.com designates 1.2.3.4 as permitted sender)
Authentication-Results: mx.receiver.com; spf=pass
DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=selector; b=abc123`

	result := AnalyzeHeader(header)

	if result.From != "sender@example.com" {
		t.Errorf("From mismatch: got %q", result.From)
	}
	if result.To != "recipient@example.com" {
		t.Errorf("To mismatch: got %q", result.To)
	}
	if result.Subject != "Test Email" {
		t.Errorf("Subject mismatch: got %q", result.Subject)
	}
	if len(result.Routing) == 0 {
		t.Error("Expected routing hops")
	}
	if len(result.AuthResults) == 0 {
		t.Error("Expected auth results")
	}
}

func TestAnalyzeHeader_WarningsAndErrorsInitialized(t *testing.T) {
	header := "From: test@example.com"
	result := AnalyzeHeader(header)

	if result.Warnings == nil {
		t.Error("Warnings should not be nil")
	}
	if result.Errors == nil {
		t.Error("Errors should not be nil")
	}
	if result.Headers == nil {
		t.Error("Headers should not be nil")
	}
	if result.Routing == nil {
		t.Error("Routing should not be nil")
	}
	if result.AuthResults == nil {
		t.Error("AuthResults should not be nil")
	}
}
