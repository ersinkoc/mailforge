package tools

import (
	"fmt"
	"regexp"
	"strings"
)

// Pre-compiled regex patterns for Received header parsing
var (
	receivedFromRe = regexp.MustCompile(`from\s+([^\s]+)`)
	receivedByRe   = regexp.MustCompile(`by\s+([^\s]+)`)
	receivedWithRe = regexp.MustCompile(`with\s+(\w+)`)
)

func AnalyzeHeader(header string) HeaderAnalysisResult {
	result := HeaderAnalysisResult{
		Headers:     make(map[string]string),
		Routing:     []RoutingHop{},
		AuthResults: make(map[string]string),
		Warnings:    []string{},
		Errors:      []string{},
	}

	if strings.TrimSpace(header) == "" {
		result.Error = "No email header provided"
		return result
	}

	lines := strings.Split(header, "\n")
	currentKey := ""
	currentValue := ""

	for _, line := range lines {
		if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
			if currentKey != "" {
				currentValue += " " + strings.TrimSpace(line)
			}
		} else {
			if currentKey != "" {
				// For duplicate headers, append with newline separator
				if existing, ok := result.Headers[currentKey]; ok {
					result.Headers[currentKey] = existing + "\n" + currentValue
				} else {
					result.Headers[currentKey] = currentValue
				}
				processHeader(&result, currentKey, currentValue)
			}
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				currentKey = strings.TrimSpace(parts[0])
				currentValue = strings.TrimSpace(parts[1])
			}
		}
	}
	if currentKey != "" {
		if existing, ok := result.Headers[currentKey]; ok {
			result.Headers[currentKey] = existing + "\n" + currentValue
		} else {
			result.Headers[currentKey] = currentValue
		}
		processHeader(&result, currentKey, currentValue)
	}

	parseRoutingFromHeaders(&result)
	analyzeAuthResults(&result)

	return result
}

func processHeader(result *HeaderAnalysisResult, key, value string) {
	switch strings.ToLower(key) {
	case "from":
		result.From = value
	case "to":
		result.To = value
	case "subject":
		result.Subject = value
	case "date":
		result.Date = value
	case "message-id":
		result.MessageID = value
	case "authentication-results":
		result.AuthResults["Authentication-Results"] = value
	case "dkim-signature":
		result.AuthResults["DKIM-Signature"] = value
	case "received-spf":
		result.AuthResults["Received-SPF"] = value
	case "arc-authentication-results":
		result.AuthResults["ARC-Authentication-Results"] = value
	}
}

func parseRoutingFromHeaders(result *HeaderAnalysisResult) {
	hop := 0
	receivedHeaders := []string{}

	for key, value := range result.Headers {
		if strings.ToLower(key) == "received" {
			// Split concatenated Received: headers (the parser joins duplicates with '\n')
			for _, line := range strings.Split(value, "\n") {
				line = strings.TrimSpace(line)
				if line != "" {
					receivedHeaders = append(receivedHeaders, line)
				}
			}
		}
	}

	for i := len(receivedHeaders) - 1; i >= 0; i-- {
		hop++
		h := RoutingHop{Hop: hop}
		entry := receivedHeaders[i]

		if match := receivedFromRe.FindStringSubmatch(entry); len(match) > 1 {
			h.From = match[1]
		}

		if match := receivedByRe.FindStringSubmatch(entry); len(match) > 1 {
			h.To = match[1]
			h.Server = match[1]
		}

		if idx := strings.LastIndex(entry, ";"); idx != -1 {
			h.Date = strings.TrimSpace(entry[idx+1:])
		}

		if match := receivedWithRe.FindStringSubmatch(entry); len(match) > 1 {
			h.Delay = fmt.Sprintf("Protocol: %s", match[1])
		}

		result.Routing = append(result.Routing, h)
	}
}

func analyzeAuthResults(result *HeaderAnalysisResult) {
	if spf, ok := result.AuthResults["Received-SPF"]; ok {
		spfLower := strings.ToLower(spf)
		if strings.Contains(spfLower, "softfail") {
			result.Warnings = append(result.Warnings, "SPF softfail - sender domain is not authorized but doesn't explicitly deny")
		} else if strings.Contains(spfLower, "fail") {
			result.Warnings = append(result.Warnings, "SPF check FAILED - sender may be spoofed")
		}
	}

	for key, value := range result.AuthResults {
		if strings.ToLower(key) == "dkim-signature" {
			if strings.Contains(strings.ToLower(value), "fail") {
				result.Warnings = append(result.Warnings, "DKIM signature verification FAILED")
			}
		}
	}

	if len(result.AuthResults) == 0 {
		result.Warnings = append(result.Warnings, "No authentication results found (SPF/DKIM/DMARC)")
	}

	for _, hop := range result.Routing {
		if hop.From == "" || hop.To == "" {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Incomplete routing information at hop %d", hop.Hop))
		}
	}
}
