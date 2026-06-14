package tools

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

var CommonDKIMSelectors = []string{
	"default", "google", "selector1", "selector2",
	"k1", "s1", "s2", "dkim", "mail", "email",
	"key1", "key2", "selector", "20161025",
	"20230601", "smtp", "mandrill", "everlytickey1",
	"everlytickey2", "dkim-a", "dkim-b",
}

func CheckDKIM(domain, selector string) DKIMResult {
	start := time.Now()
	result := DKIMResult{
		Domain:   domain,
		Selector: selector,
	}

	if selector == "" {
		selector = "default"
		result.Selector = selector
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dkimDomain := fmt.Sprintf("%s._domainkey.%s", selector, domain)

	resolver := &net.Resolver{}
	txtRecords, err := resolver.LookupTXT(ctx, dkimDomain)
	if err != nil {
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "not found") {
			result.Error = fmt.Sprintf("No DKIM record found for %s._domainkey.%s", selector, domain)
		} else {
			result.Error = fmt.Sprintf("DKIM lookup failed: %v", err)
		}
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	var dkimRecord string
	for _, txt := range txtRecords {
		if strings.HasPrefix(txt, "v=DKIM1") || strings.HasPrefix(txt, "k=") {
			dkimRecord = txt
			break
		}
	}

	if dkimRecord == "" && len(txtRecords) > 0 {
		dkimRecord = txtRecords[0]
	}

	if dkimRecord == "" {
		result.Error = fmt.Sprintf("No DKIM TXT record found for %s", dkimDomain)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	result.Record = dkimRecord
	result.Valid = true

	pairs := parseDKIMRecord(dkimRecord)
	for key, value := range pairs {
		switch key {
		case "v":
			if value != "DKIM1" {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("Unexpected DKIM version: %s", value))
			}
		case "k":
			result.KeyType = value
		case "t":
			result.Flags = value
		case "s":
			result.ServiceType = value
		case "n":
			result.Notes = value
		case "p":
			if value == "" || value == "p=" {
				result.Valid = false
				result.Error = "DKIM record has empty public key (domain may not sign email)"
			} else {
				result.KeySize = estimateKeySize(value)
			}
		}
	}

	if result.KeyType == "" {
		result.KeyType = "rsa"
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func parseDKIMRecord(record string) map[string]string {
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

func estimateKeySize(pubKey string) int {
	keyLen := len(pubKey)
	if keyLen < 200 {
		return 1024
	} else if keyLen < 400 {
		return 2048
	}
	return 4096
}
