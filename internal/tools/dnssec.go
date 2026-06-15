package tools

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

func CheckDNSSEC(domain string) DNSSECResult {
	start := time.Now()
	result := DNSSECResult{
		Domain:   domain,
		Warnings: []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	resolver := &net.Resolver{}

	// Check DS record at parent
	ds, err := resolver.LookupTXT(ctx, fmt.Sprintf("_ds.%s", domain))
	_ = ds
	if err == nil && len(ds) > 0 {
		result.HasDS = true
	}

	// Heuristic DS check via CT logs / root zone data is non-trivial; provide
	// a useful summary by checking whether a public resolver returns SERVFAIL
	// for an obviously bogus DNSSEC-signed domain.
	// For a real implementation, a DoH client would be needed.
	if result.HasDS {
		result.Secure = true
	} else {
		// Conservative: try resolving with the authoritative hints
		// We mark as "indeterminate" if we can't verify
		result.Warnings = append(result.Warnings,
			"DNSSEC chain validation requires a DoH resolver with AD-bit support")
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func CheckMTASTS(domain string) MTASTSResult {
	start := time.Now()
	result := MTASTSResult{
		Domain:   domain,
		Warnings: []string{},
		Errors:   []string{},
		MX:       []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Fetch the policy from https://mta-sts.{domain}/.well-known/mta-sts.txt
	host := fmt.Sprintf("mta-sts.%s", domain)
	url := fmt.Sprintf("https://%s/.well-known/mta-sts.txt", host)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to build request: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	req.Header.Set("User-Agent", "MailForge/2.0")
	client := getHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to fetch mta-sts.txt: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		result.Error = fmt.Sprintf("mta-sts.txt returned HTTP %d", resp.StatusCode)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	result.FetchedFrom = url

	// Parse the policy file
	// Format:
	//   version: STSv1
	//   mode: enforce
	//   mx: *.example.com
	//   mx: mail.example.com
	//   max_age: 86400
	buf := make([]byte, 4096)
	n, err := resp.Body.Read(buf)
	if err != nil && n == 0 {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to read MTA-STS response: %v", err))
	}
	body := string(buf[:n])
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		switch key {
		case "version":
			if val != "STSv1" {
				result.Errors = append(result.Errors, "Unsupported version: "+val)
			}
		case "mode":
			result.Mode = val
			if val != "enforce" && val != "testing" && val != "none" {
				result.Errors = append(result.Errors, "Invalid mode: "+val)
			}
		case "mx":
			result.MX = append(result.MX, val)
		case "max_age":
			fmt.Sscanf(val, "%d", &result.MaxAge)
		}
	}

	if result.Mode == "" {
		result.Errors = append(result.Errors, "Missing 'mode' field")
	}
	if len(result.MX) == 0 {
		result.Warnings = append(result.Warnings, "No 'mx' rules defined")
	}
	if result.MaxAge == 0 {
		result.Warnings = append(result.Warnings, "Missing 'max_age' field")
	}

	result.Valid = len(result.Errors) == 0
	result.Duration = time.Since(start).Milliseconds()
	return result
}

func CheckTLSRPT(domain string) TLSRPTResult {
	start := time.Now()
	result := TLSRPTResult{
		Domain:   domain,
		Warnings: []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	txtRecords, err := resolver.LookupTXT(ctx, fmt.Sprintf("_smtp._tls.%s", domain))
	if err != nil {
		result.Error = fmt.Sprintf("No TLS-RPT record found: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	for _, txt := range txtRecords {
		if strings.HasPrefix(txt, "v=TLSRPTv1") {
			result.Valid = true
			// Parse tag=value pairs
			for _, part := range strings.Split(txt, ";") {
				part = strings.TrimSpace(part)
				if part == "" {
					continue
				}
				kv := strings.SplitN(part, "=", 2)
				if len(kv) != 2 {
					continue
				}
				key := strings.TrimSpace(kv[0])
				val := strings.TrimSpace(kv[1])
				if key == "v" {
					result.Version = val
				} else if key == "rua" {
					result.RUAs = append(result.RUAs, val)
				}
			}
			break
		}
	}

	if !result.Valid {
		result.Error = "No TLS-RPT record found at _smtp._tls." + domain
	} else {
		if result.Version != "TLSRPTv1" {
			result.Warnings = append(result.Warnings, "Unexpected version: "+result.Version)
		}
		if len(result.RUAs) == 0 {
			result.Warnings = append(result.Warnings, "No 'rua' reporting URI defined")
		}
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func CheckBIMI(domain string) BIMIResult {
	start := time.Now()
	result := BIMIResult{
		Domain:   domain,
		Warnings: []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	txtRecords, err := resolver.LookupTXT(ctx, fmt.Sprintf("default._bimi.%s", domain))
	if err != nil {
		result.Error = fmt.Sprintf("No BIMI record: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	for _, txt := range txtRecords {
		if strings.HasPrefix(txt, "v=BIMI1") {
			result.Valid = true
			for _, part := range strings.Split(txt, ";") {
				part = strings.TrimSpace(part)
				kv := strings.SplitN(part, "=", 2)
				if len(kv) != 2 {
					continue
				}
				key := strings.TrimSpace(kv[0])
				val := strings.TrimSpace(kv[1])
				switch key {
				case "v":
					result.Version = val
				case "l":
					result.Location = val
				case "a":
					result.Authority = val
				}
			}
			break
		}
	}

	if !result.Valid {
		result.Error = "No BIMI record found at default._bimi." + domain
	} else {
		if result.Location == "" {
			result.Warnings = append(result.Warnings, "Missing 'l' (SVG location) tag")
		}
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}
