package tools

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

func CheckDMARC(domain string) DMARCResult {
	start := time.Now()
	result := DMARCResult{
		Domain:    domain,
		Warnings:  []string{},
		Errors:    []string{},
		Aggregate: []string{},
		Forensic:  []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dmarcDomain := fmt.Sprintf("_dmarc.%s", domain)

	resolver := &net.Resolver{}
	txtRecords, err := resolver.LookupTXT(ctx, dmarcDomain)
	if err != nil {
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "not found") {
			result.Error = fmt.Sprintf("No DMARC record found for %s", domain)
		} else {
			result.Error = fmt.Sprintf("DMARC lookup failed: %v", err)
		}
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	var dmarcRecord string
	for _, txt := range txtRecords {
		if strings.HasPrefix(txt, "v=DMARC1") {
			dmarcRecord = txt
			break
		}
	}

	if dmarcRecord == "" {
		result.Error = fmt.Sprintf("No DMARC record found for _dmarc.%s", domain)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	result.Record = dmarcRecord
	result.Valid = true

	pairs := parseDMARCRecord(dmarcRecord)
	for key, value := range pairs {
		switch key {
		case "v":
			if value != "DMARC1" {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("Unexpected DMARC version: %s", value))
			}
		case "p":
			result.Policy = value
			if value == "none" {
				result.Warnings = append(result.Warnings,
					"Policy is 'none' - DMARC is not enforcing. Consider upgrading to 'quarantine' or 'reject'.")
			}
		case "sp":
			result.SubPolicy = value
		case "pct":
			pct := 0
			fmt.Sscanf(value, "%d", &pct)
			result.Percent = pct
			if pct < 100 {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("DMARC policy applied to only %d%% of messages", pct))
			}
		case "rua":
			result.RUA = value
			result.Aggregate = append(result.Aggregate, value)
		case "ruf":
			result.RUF = value
			result.Forensic = append(result.Forensic, value)
		case "adkim":
			result.ADKIM = value
			if value == "s" {
				result.Warnings = append(result.Warnings,
					"DKIM alignment mode is strict ('s'). Emails must align exactly.")
			}
		case "aspf":
			result.ASPF = value
			if value == "s" {
				result.Warnings = append(result.Warnings,
					"SPF alignment mode is strict ('s'). Emails must align exactly.")
			}
		case "fo":
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Failure reporting options: %s", value))
		case "ri":
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Aggregate report interval: %s seconds", value))
		}
	}

	if result.Policy == "none" && len(result.Aggregate) == 0 {
		result.Warnings = append(result.Warnings,
			"Recommended: Add 'rua' tag for aggregate reporting even with 'p=none'")
	}
	if result.Policy == "" {
		result.Errors = append(result.Errors, "Missing 'p' (policy) tag - required")
		result.Valid = false
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func parseDMARCRecord(record string) map[string]string {
	pairs := make(map[string]string)
	parts := strings.Split(record, ";")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 {
			pairs[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return pairs
}
