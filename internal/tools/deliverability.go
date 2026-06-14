package tools

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

// ComputeDeliverability aggregates SPF/DKIM/DMARC/MTA-STS/TLSRPT/BIMI/DNSSEC/Blacklist
// into a single 0-100 score with a letter grade.
func ComputeDeliverability(domain string) DeliverabilityResult {
	start := time.Now()
	result := DeliverabilityResult{
		Domain:          domain,
		Recommendations: []string{},
	}

	// ── Run each component sequentially; could be parallelized later ──
	spf := CheckSPF(domain)
	result.SPF = gradeComponent(spf.Valid && spf.Error == "", "SPF", spf.Record)
	if !spf.Valid || spf.Error != "" {
		result.Recommendations = append(result.Recommendations,
			fmt.Sprintf("Add an SPF record at %s: \"v=spf1 -all\" (or include your senders)", domain))
	} else if spf.DNSLookups > spf.MaxLookups {
		result.Recommendations = append(result.Recommendations,
			"SPF has too many DNS lookups — flatten or remove unused includes")
	}

	// DKIM: probe a few common selectors
	dkimSelectors := []string{"default", "google", "selector1", "selector2", "k1", "mandrill"}
	dkimFound := false
	for _, sel := range dkimSelectors {
		d := CheckDKIM(domain, sel)
		if d.Valid && d.Error == "" {
			dkimFound = true
			break
		}
	}
	result.DKIM = gradeComponent(dkimFound, "DKIM", "")
	if !dkimFound {
		result.Recommendations = append(result.Recommendations,
			"No DKIM record found on common selectors — ensure your ESP has published a DKIM key")
	}

	dmarc := CheckDMARC(domain)
	dmarcOk := dmarc.Valid && dmarc.Error == ""
	result.DMARC = gradeComponent(dmarcOk, "DMARC", dmarc.Record)
	if !dmarcOk {
		result.Recommendations = append(result.Recommendations,
			fmt.Sprintf("Add a DMARC record at _dmarc.%s: \"v=DMARC1; p=reject; rua=mailto:dmarc@%s\"", domain, domain))
	} else if dmarc.Policy == "none" {
		result.Recommendations = append(result.Recommendations,
			"DMARC policy is 'none' — upgrade to 'quarantine' or 'reject' for enforcement")
	}

	mta := CheckMTASTS(domain)
	result.MTASTS = gradeComponent(mta.Valid && mta.Error == "", "MTA-STS", mta.Mode)
	if !mta.Valid || mta.Error != "" {
		result.Recommendations = append(result.Recommendations,
			"Publish an MTA-STS policy at https://mta-sts."+domain+"/.well-known/mta-sts.txt")
	}

	tlsRpt := CheckTLSRPT(domain)
	result.TLReporting = gradeComponent(tlsRpt.Valid && tlsRpt.Error == "", "TLS-RPT", tlsRpt.Version)
	if !tlsRpt.Valid || tlsRpt.Error != "" {
		result.Recommendations = append(result.Recommendations,
			"Add a TLS-RPT record at _smtp._tls."+domain+" for TLS failure reports")
	}

	bimi := CheckBIMI(domain)
	result.BIMI = gradeComponent(bimi.Valid && bimi.Error == "", "BIMI", bimi.Version)
	if !bimi.Valid || bimi.Error != "" {
		// BIMI is optional — only mild recommendation
	}

	// DNSSEC
	dnssec := CheckDNSSEC(domain)
	result.DNSSEC = gradeComponent(dnssec.Secure, "DNSSEC", "")

	// Blacklist: resolve first A record then check
	blacklistOk := true
	if ips, err := lookupDomainIPs(domain); err == nil && len(ips) > 0 {
		bl := CheckBlacklist(ips[0])
		if bl.Listed > 0 {
			blacklistOk = false
		}
	}
	result.Blacklist = gradeComponent(blacklistOk, "Blacklist", "")

	// ── Aggregate score ──
	weights := map[string]int{
		"SPF": 15, "DKIM": 15, "DMARC": 20, "MTA-STS": 10,
		"TLS-RPT": 10, "BIMI": 5, "DNSSEC": 10, "Blacklist": 15,
	}
	components := map[string]ComponentCheck{
		"SPF": result.SPF, "DKIM": result.DKIM, "DMARC": result.DMARC,
		"MTA-STS": result.MTASTS, "TLS-RPT": result.TLReporting, "BIMI": result.BIMI,
		"DNSSEC": result.DNSSEC, "Blacklist": result.Blacklist,
	}
	totalScore := 0
	totalWeight := 0
	for name, c := range components {
		w := weights[name]
		totalScore += (c.Score * w) / 100
		totalWeight += w
	}
	if totalWeight > 0 {
		result.Score = (totalScore * 100) / totalWeight
	}

	switch {
	case result.Score >= 90:
		result.Grade = "A+"
	case result.Score >= 80:
		result.Grade = "A"
	case result.Score >= 70:
		result.Grade = "B"
	case result.Score >= 55:
		result.Grade = "C"
	case result.Score >= 40:
		result.Grade = "D"
	default:
		result.Grade = "F"
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func gradeComponent(passed bool, name, detail string) ComponentCheck {
	c := ComponentCheck{
		Name: name,
		Present: detail != "",
		Valid: passed,
		Detail: detail,
	}
	if passed {
		c.Score = 100
	} else if c.Present {
		c.Score = 40
	} else {
		c.Score = 0
	}
	return c
}

func lookupDomainIPs(domain string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	resolver := &net.Resolver{}
	ips, err := resolver.LookupIP(ctx, "ip", domain)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(ips))
	for _, ip := range ips {
		if ip4 := ip.To4(); ip4 != nil {
			out = append(out, ip4.String())
		}
	}
	return out, nil
}

// EmailAddress is a simple parser that splits address into local/domain
func splitEmail(email string) (local, domain string, ok bool) {
	email = strings.TrimSpace(strings.ToLower(email))
	idx := strings.LastIndex(email, "@")
	if idx <= 0 || idx == len(email)-1 {
		return "", "", false
	}
	return email[:idx], email[idx+1:], true
}
