package tools

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

// LookupMX performs a dedicated MX lookup and resolves A/AAAA records for each MX host.
func LookupMX(domain string) MXLookupResult {
	start := time.Now()
	result := MXLookupResult{Domain: domain}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	domain = strings.TrimSuffix(domain, ".")
	result.Domain = domain

	resolver := &net.Resolver{}

	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err != nil {
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "not found") {
			result.Warn = "No MX records found for domain"
		} else {
			result.Error = fmt.Sprintf("MX lookup failed: %v", err)
		}
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	for _, mx := range mxRecords {
		host := strings.TrimSuffix(mx.Host, ".")
		detail := MXDetail{
			Host:     host,
			Priority: mx.Pref,
			Valid:    true,
		}

		// Resolve IPs for this MX host
		ips, err := resolver.LookupIP(ctx, "ip", host)
		if err == nil {
			for _, ip := range ips {
				detail.IPs = append(detail.IPs, ip.String())
			}
		}

		result.MX = append(result.MX, detail)
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func LookupDNS(domain string) DNSLookupResult {
	start := time.Now()
	result := DNSLookupResult{Domain: domain}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	domain = strings.TrimSuffix(domain, ".")
	result.Domain = domain

	resolver := &net.Resolver{}

	// MX Records
	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err != nil {
		if !strings.Contains(err.Error(), "no such host") {
			result.Warn = fmt.Sprintf("MX lookup warning: %v", err)
		}
	}
	for _, mx := range mxRecords {
		host := strings.TrimSuffix(mx.Host, ".")
		result.MX = append(result.MX, MXRecord{
			Host:     host,
			Priority: mx.Pref,
		})
	}

	// A/AAAA Records
	ips, err := resolver.LookupIP(ctx, "ip", domain)
	if err == nil {
		for _, ip := range ips {
			if ip4 := ip.To4(); ip4 != nil {
				result.A = append(result.A, ARecord{IP: ip4.String()})
			} else {
				result.AAAA = append(result.AAAA, AAAARecord{IP: ip.String()})
			}
		}
	}

	// TXT Records
	txtRecords, err := resolver.LookupTXT(ctx, domain)
	if err == nil {
		for _, txt := range txtRecords {
			result.TXT = append(result.TXT, TXTRecord{Text: txt})
		}
	}

	// NS Records
	nsRecords, err := resolver.LookupNS(ctx, domain)
	if err == nil {
		for _, ns := range nsRecords {
			host := strings.TrimSuffix(ns.Host, ".")
			result.NS = append(result.NS, NSRecord{Host: host})
		}
	}

	// CNAME Records
	cname, err := resolver.LookupCNAME(ctx, domain)
	if err == nil {
		result.CNAME = &CNAMERecord{Target: strings.TrimSuffix(cname, ".")}
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func ReverseDNS(ip string) ReverseDNSResult {
	start := time.Now()
	result := ReverseDNSResult{IP: ip}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	hosts, err := resolver.LookupAddr(ctx, ip)
	if err != nil {
		if strings.Contains(err.Error(), "no such host") {
			result.Hosts = []string{}
		} else {
			result.Error = fmt.Sprintf("Reverse DNS lookup failed: %v", err)
		}
	} else {
		for _, host := range hosts {
			result.Hosts = append(result.Hosts, strings.TrimSuffix(host, "."))
		}
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}
