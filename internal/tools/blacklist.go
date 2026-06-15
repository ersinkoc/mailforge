package tools

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

var DefaultBlacklists = []struct {
	Name string
	DNS  string
}{
	{"Spamhaus ZEN", "zen.spamhaus.org"},
	{"SpamCop", "bl.spamcop.net"},
	{"Barracuda BRBL", "b.barracudacentral.org"},
	{"SORBS", "dnsbl.sorbs.net"},
	{"Spamhaus SBL", "sbl.spamhaus.org"},
	{"Spamhaus XBL", "xbl.spamhaus.org"},
	{"Spamhaus PBL", "pbl.spamhaus.org"},
	{"CBL", "cbl.abuseat.org"},
	{"DBL", "dbl.spamhaus.org"},
	{"NJABL", "dnsbl.njabl.org"},
	{"Talos Intelligence", "dnsbl.talosintelligence.com"},
	{"Mailspike", "bl.mailspike.org"},
	{"Invaluement", "ivmSIP.dnsbl-ivm-4.net"},
	{"DroneBL", "dnsbl.dronebl.org"},
	{"OpenBL", "dnsbl.openbl.org"},
	{"BSB", "bsb.spamlookup.net"},
	{"Dynablock", "dynablock.spamhaus.org"},
	{"Sorbs Agg", "aggregate.sorbs.net"},
	{"SpamRATS", "spamat.rats.com"},
	{"PSBL", "psbl.surriel.com"},
}

func CheckBlacklist(ip string) BlacklistResult {
	start := time.Now()
	result := BlacklistResult{
		IP:    ip,
		Lists: make([]BlacklistEntry, 0, len(DefaultBlacklists)),
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		result.Error = fmt.Sprintf("Invalid IP address: %s", ip)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	var reversed string

	parts4 := parsedIP.To4()
	if parts4 != nil {
		// IPv4: reverse octets
		parts := strings.Split(parts4.String(), ".")
		if len(parts) == 4 {
			reversed = fmt.Sprintf("%s.%s.%s.%s", parts[3], parts[2], parts[1], parts[0])
		} else {
			result.Error = "Only IPv4 addresses are supported for blacklist checks"
			result.Duration = time.Since(start).Milliseconds()
			return result
		}
	} else {
		// IPv6: reverse the full 128-bit address as hex nibbles
		ipv6 := parsedIP.To16()
		if ipv6 == nil {
			result.Error = "Invalid IP address"
			result.Duration = time.Since(start).Milliseconds()
			return result
		}
		// Reverse the hex representation nibble by nibble
		var sb strings.Builder
		for i := 15; i >= 0; i-- {
			sb.WriteString(fmt.Sprintf("%02x.", ipv6[i]&0x0F))
			sb.WriteString(fmt.Sprintf("%c.", (ipv6[i]>>4)&0x0F))
		}
		reversed = sb.String()[:sb.Len()-1] // Remove trailing dot
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	results := make([]BlacklistEntry, len(DefaultBlacklists))
	count := 0

	for i, bl := range DefaultBlacklists {
		wg.Add(1)
		go func(idx int, blName, blDNS string) {
			defer wg.Done()
			results[idx] = checkSingleBlacklist(reversed, blName, blDNS)
		}(i, bl.Name, bl.DNS)
	}
	wg.Wait()

	// Merge results under lock to ensure consistent update
	mu.Lock()
	for _, entry := range results {
		result.Lists = append(result.Lists, entry)
		if entry.Listed {
			result.Listed++
		} else if entry.Error == "" {
			result.Clean++
		}
		count++
	}
	mu.Unlock()

	result.Total = count
	result.Duration = time.Since(start).Milliseconds()
	return result
}

func checkSingleBlacklist(reversedIP, name, dnsBL string) BlacklistEntry {
	entry := BlacklistEntry{Name: name}

	query := fmt.Sprintf("%s.%s", reversedIP, dnsBL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	ips, err := resolver.LookupIPAddr(ctx, query)
	if err != nil {
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "not found") {
			entry.Listed = false
		} else {
			entry.Error = fmt.Sprintf("DNS error: %v", err)
		}
		return entry
	}

	if len(ips) > 0 {
		entry.Listed = true
		entry.Response = ips[0].IP.String()
	}

	return entry
}
