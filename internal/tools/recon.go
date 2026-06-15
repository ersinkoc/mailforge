package tools

import (
	"strings"
	"time"
)

// ReconResult holds the complete reconnaissance results for a domain
type ReconResult struct {
	Domain         string                  `json:"domain"`
	Timestamp      string                  `json:"timestamp"`
	TotalDuration  int64                   `json:"total_duration_ms"`
	Summary        ReconSummary            `json:"summary"`
	Whois          WhoisResult           `json:"whois,omitempty"`
	DNS            DNSLookupResult       `json:"dns,omitempty"`
	MX             MXLookupResult        `json:"mx,omitempty"`
	SPF            SPFResult              `json:"spf,omitempty"`
	DKIM           DKIMResult            `json:"dkim,omitempty"`
	DMARC          DMARCResult           `json:"dmarc,omitempty"`
	DNSSEC         DNSSECResult          `json:"dnssec,omitempty"`
	Subdomains     SubdomainResult       `json:"subdomains,omitempty"`
	PortScan       PortScanResult        `json:"port_scan,omitempty"`
	TLS            TLSInspectResult      `json:"tls,omitempty"`
	GeoIP          IPGeoResult           `json:"geoip,omitempty"`
	Blacklist      BlacklistResult       `json:"blacklist,omitempty"`
	Deliverability DeliverabilityResult  `json:"deliverability,omitempty"`
	EmailValidate  EmailValidationResult  `json:"email_validate,omitempty"`
	Errors         []ReconError          `json:"errors,omitempty"`
}

// ReconSummary provides a quick overview of the reconnaissance
type ReconSummary struct {
	DomainAge     string `json:"domain_age"`
	DomainExpires string `json:"domain_expires"`
	MailProvider  string `json:"mail_provider"`
	SecurityScore string `json:"security_score"`
	IssuesFound   int    `json:"issues_found"`
	Warnings      int    `json:"warnings"`
}

// ReconError tracks errors during reconnaissance
type ReconError struct {
	Tool  string `json:"tool"`
	Error string `json:"error"`
	Phase string `json:"phase"`
}

// RunRecon performs a comprehensive reconnaissance on a domain
// It runs all relevant tools in sequence and produces a consolidated report
func RunRecon(domain string) *ReconResult {
	start := time.Now()
	result := &ReconResult{
		Domain:    domain,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Summary: ReconSummary{
			SecurityScore: "Unknown",
		},
	}

	// Phase 1: Basic Information (WHOIS, DNS)
	result.Whois = CheckWhois(domain, false)
	result.DNS = LookupDNS(domain)
	result.MX = LookupMX(domain)

	// Phase 2: Email Security (SPF, DKIM, DMARC)
	result.SPF = CheckSPF(domain)
	result.DKIM = CheckDKIM(domain, "default")
	result.DMARC = CheckDMARC(domain)

	// Phase 3: DNSSEC
	result.DNSSEC = CheckDNSSEC(domain)

	// Phase 4: Subdomain Discovery
	result.Subdomains = DiscoverSubdomains(domain)

	// Phase 5: Port Scanning (common ports)
	ips := extractIPs(result.DNS)
	if len(ips) > 0 {
		result.PortScan = ScanPorts(ips[0], []int{21, 22, 25, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 8080, 8443})
	}

	// Phase 6: TLS Information
	if len(ips) > 0 {
		result.TLS = InspectTLS(domain, 443)
	}

	// Phase 7: Geolocation
	if len(ips) > 0 {
		result.GeoIP = LookupIPGeo(ips[0])
	}

	// Phase 8: Blacklist Check
	if len(ips) > 0 {
		result.Blacklist = CheckBlacklist(ips[0])
	}

	// Phase 9: Deliverability Score
	result.Deliverability = ComputeDeliverability(domain)

	// Phase 10: Email Validation
	result.EmailValidate = ValidateEmail("admin@" + domain)

	// Calculate summary
	result.Summary = calculateReconSummary(result)
	result.TotalDuration = time.Since(start).Milliseconds()

	return result
}

// RunReconLight performs a faster reconnaissance without heavy scans
func RunReconLight(domain string) *ReconResult {
	start := time.Now()
	result := &ReconResult{
		Domain:    domain,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Summary: ReconSummary{
			SecurityScore: "Unknown",
		},
	}

	// Core checks only
	result.Whois = CheckWhois(domain, false)
	result.DNS = LookupDNS(domain)
	result.MX = LookupMX(domain)
	result.SPF = CheckSPF(domain)
	result.DKIM = CheckDKIM(domain, "default")
	result.DMARC = CheckDMARC(domain)
	result.DNSSEC = CheckDNSSEC(domain)
	result.Deliverability = ComputeDeliverability(domain)

	// Get IPs for additional checks
	ips := extractIPs(result.DNS)
	if len(ips) > 0 {
		result.GeoIP = LookupIPGeo(ips[0])
		result.Blacklist = CheckBlacklist(ips[0])
	}

	// Calculate summary
	result.Summary = calculateReconSummary(result)
	result.TotalDuration = time.Since(start).Milliseconds()

	return result
}

// RunReconAsync runs reconnaissance with progress callbacks
func RunReconAsync(domain string, progress func(phase string, percent int)) *ReconResult {
	start := time.Now()
	result := &ReconResult{
		Domain:    domain,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Summary: ReconSummary{
			SecurityScore: "Unknown",
		},
	}

	phases := []struct {
		name   string
		percent int
	}{
		{"WHOIS Lookup", 10},
		{"DNS Records", 20},
		{"MX Records", 30},
		{"SPF Check", 40},
		{"DKIM Check", 50},
		{"DMARC Check", 60},
		{"DNSSEC Check", 70},
		{"Subdomain Discovery", 80},
		{"Deliverability", 90},
	}

	total := len(phases)
	for i, phase := range phases {
		if progress != nil {
			progress(phase.name, phase.percent)
		}

		// Execute the appropriate check
		switch i {
		case 0:
			result.Whois = CheckWhois(domain, false)
		case 1:
			result.DNS = LookupDNS(domain)
		case 2:
			result.MX = LookupMX(domain)
		case 3:
			result.SPF = CheckSPF(domain)
		case 4:
			result.DKIM = CheckDKIM(domain, "default")
		case 5:
			result.DMARC = CheckDMARC(domain)
		case 6:
			result.DNSSEC = CheckDNSSEC(domain)
		case 7:
			result.Subdomains = DiscoverSubdomains(domain)
		case 8:
			result.Deliverability = ComputeDeliverability(domain)
		}

		if (i+1)%3 == 0 || i == total-1 {
			if progress != nil {
				progress("Processing", phase.percent+10)
			}
		}
	}

	// Get IPs for additional checks
	ips := extractIPs(result.DNS)
	if len(ips) > 0 {
		if progress != nil {
			progress("Port Scan", 85)
		}
		result.PortScan = ScanPorts(ips[0], []int{25, 80, 443})

		if progress != nil {
			progress("TLS Info", 90)
		}
		result.TLS = InspectTLS(domain, 443)

		if progress != nil {
			progress("GeoIP", 95)
		}
		result.GeoIP = LookupIPGeo(ips[0])
		result.Blacklist = CheckBlacklist(ips[0])
	}

	// Calculate summary
	result.Summary = calculateReconSummary(result)
	result.TotalDuration = time.Since(start).Milliseconds()

	if progress != nil {
		progress("Complete", 100)
	}

	return result
}

// calculateReconSummary computes the summary from all results
func calculateReconSummary(result *ReconResult) ReconSummary {
	summary := ReconSummary{}
	issues := 0
	warnings := 0

	// Domain age and expiry from WHOIS
	if result.Whois.CreatedAt != "" {
		summary.DomainAge = result.Whois.CreatedAt
	}
	if result.Whois.ExpiresAt != "" {
		summary.DomainExpires = result.Whois.ExpiresAt
	}

	// Mail provider from MX
	if len(result.MX.MX) > 0 {
		mxHost := result.MX.MX[0].Host
		summary.MailProvider = extractMailProvider(mxHost)
	}

	// Security checks
	if !result.SPF.Valid {
		issues++
	}

	if !result.DMARC.Valid {
		issues++
	}

	if result.DKIM.Error != "" {
		warnings++
	}

	if !result.DNSSEC.Secure {
		issues++
	}

	if result.Blacklist.Listed > 0 {
		issues++
		summary.SecurityScore = "Poor"
	}

	if result.TLS.Error != "" {
		warnings++
	}

	// Calculate overall score
	if issues == 0 && warnings == 0 {
		summary.SecurityScore = "Excellent"
	} else if issues == 0 {
		summary.SecurityScore = "Good"
	} else if issues <= 2 {
		summary.SecurityScore = "Fair"
	} else {
		summary.SecurityScore = "Poor"
	}

	summary.IssuesFound = issues
	summary.Warnings = warnings

	return summary
}

// extractIPs extracts IPv4 addresses from DNS result
func extractIPs(dns DNSLookupResult) []string {
	var ips []string
	for _, a := range dns.A {
		ips = append(ips, a.IP)
	}
	return ips
}

// extractMailProvider guesses the email provider from MX record
func extractMailProvider(mxHost string) string {
	mxLower := strings.ToLower(mxHost)
	switch {
	case strings.Contains(mxLower, "google"):
		return "Google Workspace"
	case strings.Contains(mxLower, "microsoft"), strings.Contains(mxLower, "outlook"), strings.Contains(mxLower, "office365"):
		return "Microsoft 365"
	case strings.Contains(mxLower, "amazon"), strings.Contains(mxLower, "aws"):
		return "Amazon SES"
	case strings.Contains(mxLower, "apple"), strings.Contains(mxLower, "icloud"):
		return "Apple Mail"
	case strings.Contains(mxLower, "proton"):
		return "Proton Mail"
	case strings.Contains(mxLower, "zoho"):
		return "Zoho Mail"
	case strings.Contains(mxLower, "yandex"):
		return "Yandex Mail"
	case strings.Contains(mxLower, "mailgun"):
		return "Mailgun"
	case strings.Contains(mxLower, "sendgrid"):
		return "SendGrid"
	case strings.Contains(mxLower, "migadu"):
		return "Migadu"
	default:
		return mxHost
	}
}
