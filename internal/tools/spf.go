package tools

import (
	"context"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

func CheckSPF(domain string) SPFResult {
	start := time.Now()
	result := SPFResult{
		Domain:     domain,
		MaxLookups: 10,
		Warnings:   []string{},
		Errors:     []string{},
		Mechanisms: []SPFMechanism{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	txtRecords, err := resolver.LookupTXT(ctx, domain)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to lookup TXT records: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	var spfRecord string
	for _, txt := range txtRecords {
		if strings.HasPrefix(txt, "v=spf1") {
			spfRecord = txt
			break
		}
	}

	if spfRecord == "" {
		result.Errors = append(result.Errors, "No SPF record found for domain")
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	result.Record = spfRecord
	result.Valid = true

	result.Mechanisms, result.DNSLookups, result.Warnings, result.Errors = parseSPF(spfRecord)

	if result.DNSLookups > result.MaxLookups {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Too many DNS lookups: %d (max %d)", result.DNSLookups, result.MaxLookups))
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func parseSPF(record string) ([]SPFMechanism, int, []string, []string) {
	var mechanisms []SPFMechanism
	var warnings, errors []string
	dnsLookups := 0

	record = strings.TrimPrefix(record, "v=spf1")
	record = strings.TrimSpace(record)

	parts := strings.Fields(record)
	mechanismRe := regexp.MustCompile(`^(all|include|a|mx|ip4|ip6|exists|redirect|exp)$`)

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		mech := SPFMechanism{Value: part}

		if mechanismRe.MatchString(part) {
			mech.Type = part
			mech.Description = getMechanismDescription(part, "")
			dnsLookups++
		} else if strings.HasPrefix(part, "include:") {
			mech.Type = "include"
			domain := strings.TrimPrefix(part, "include:")
			mech.Value = domain
			mech.Description = fmt.Sprintf("Include SPF record from %s", domain)
			dnsLookups++
		} else if strings.HasPrefix(part, "a") && (len(part) == 1 || part[1] == '/' || part[1] == ':') {
			mech.Type = "a"
			mech.Description = "Allow IP(s) matching A/AAAA record"
			dnsLookups++
		} else if strings.HasPrefix(part, "mx") && (len(part) == 2 || part[2] == '/' || part[2] == ':') {
			mech.Type = "mx"
			mech.Description = "Allow IP(s) matching MX record"
			dnsLookups++
		} else if strings.HasPrefix(part, "ip4:") {
			mech.Type = "ip4"
			ip := strings.TrimPrefix(part, "ip4:")
			mech.Value = ip
			mech.Description = fmt.Sprintf("Allow IPv4 address/CIDR: %s", ip)
			if !strings.Contains(ip, "/") {
				if net.ParseIP(ip) == nil {
					errors = append(errors, fmt.Sprintf("Invalid IPv4 address: %s", ip))
				}
			} else {
				_, _, err := net.ParseCIDR(ip)
				if err != nil {
					errors = append(errors, fmt.Sprintf("Invalid IPv4 CIDR: %s", ip))
				}
			}
		} else if strings.HasPrefix(part, "ip6:") {
			mech.Type = "ip6"
			ip := strings.TrimPrefix(part, "ip6:")
			mech.Value = ip
			mech.Description = fmt.Sprintf("Allow IPv6 address/CIDR: %s", ip)
		} else if strings.HasPrefix(part, "exists:") {
			mech.Type = "exists"
			mech.Value = strings.TrimPrefix(part, "exists:")
			mech.Description = "Allow if DNS lookup returns A record"
			dnsLookups++
		} else if strings.HasPrefix(part, "redirect=") {
			mech.Type = "redirect"
			mech.Value = strings.TrimPrefix(part, "redirect=")
			mech.Description = fmt.Sprintf("Redirect to SPF record of %s", mech.Value)
			dnsLookups++
		} else if strings.HasPrefix(part, "exp=") {
			mech.Type = "exp"
			mech.Value = strings.TrimPrefix(part, "exp=")
			mech.Description = "Explanation message for failures"
		} else if strings.HasPrefix(part, "+") {
			pure := strings.TrimPrefix(part, "+")
			mech.Type = "pass"
			mech.Value = pure
			mech.Description = fmt.Sprintf("Pass (explicit): %s", pure)
		} else if strings.HasPrefix(part, "-") {
			pure := strings.TrimPrefix(part, "-")
			mech.Type = "fail"
			mech.Value = pure
			mech.Description = fmt.Sprintf("Fail: %s", pure)
		} else if strings.HasPrefix(part, "~") {
			pure := strings.TrimPrefix(part, "~")
			mech.Type = "softfail"
			mech.Value = pure
			mech.Description = fmt.Sprintf("Softfail: %s", pure)
		} else if strings.HasPrefix(part, "?") {
			pure := strings.TrimPrefix(part, "?")
			mech.Type = "neutral"
			mech.Value = pure
			mech.Description = fmt.Sprintf("Neutral: %s", pure)
		} else {
			if strings.Contains(part, "/") {
				_, _, err := net.ParseCIDR(part)
				if err == nil {
					mech.Type = "ip4"
					mech.Value = part
					mech.Description = fmt.Sprintf("Allow IP/CIDR: %s", part)
				} else {
					warnings = append(warnings, fmt.Sprintf("Unknown mechanism: %s", part))
				}
			} else if net.ParseIP(part) != nil {
				mech.Type = "ip4"
				mech.Value = part
				mech.Description = fmt.Sprintf("Allow IP: %s", part)
			} else {
				mech.Type = "include"
				mech.Value = part
				mech.Description = fmt.Sprintf("Implicit include: %s", part)
				dnsLookups++
			}
		}

		mechanisms = append(mechanisms, mech)
	}

	return mechanisms, dnsLookups, warnings, errors
}

func getMechanismDescription(mechanism, value string) string {
	switch mechanism {
	case "all":
		return "Match all senders - final qualifier"
	case "a":
		return "Allow IP(s) matching A/AAAA record of domain"
	case "mx":
		return "Allow IP(s) matching MX record of domain"
	case "include":
		return fmt.Sprintf("Include SPF record from %s", value)
	case "ip4":
		return fmt.Sprintf("Allow IPv4: %s", value)
	case "ip6":
		return fmt.Sprintf("Allow IPv6: %s", value)
	case "exists":
		return "Allow if DNS A lookup returns result"
	case "redirect":
		return fmt.Sprintf("Redirect to %s", value)
	case "exp":
		return "Custom explanation for failures"
	default:
		pure := strings.TrimLeft(mechanism, "+-~?")
		qualifier := mechanism[:len(mechanism)-len(pure)]
		base := getMechanismDescription(pure, value)
		switch qualifier {
		case "-":
			return base + " (fail - reject)"
		case "~":
			return base + " (softfail - mark suspicious)"
		case "?":
			return base + " (neutral - no action)"
		default:
			return base + " (pass - allow)"
		}
	}
}
