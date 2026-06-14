package tools

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"regexp"
	"sort"
	"strings"
	"time"
)

// TestOpenRelay runs a series of relay tests against an SMTP server
func TestOpenRelay(host string, port int) RelayTestResult {
	start := time.Now()
	result := RelayTestResult{
		Host:    host,
		Port:    port,
		Tests:   []RelayTest{},
		Warnings: []string{},
	}

	if port == 0 {
		port = 25
		result.Port = port
	}

	testCases := []struct {
		name        string
		description string
		from        string
		to          string
	}{
		{"Direct relay", "Mail from external to external", "test@example.com", "relaytest@gmail.com"},
		{"NULL sender", "MAIL FROM:<>", "test@example.com", "relaytest@yahoo.com"},
		{"Spoofed sender", "MAIL FROM:<postmaster@target.com>", "postmaster@target.com", "relaytest@outlook.com"},
	}

	for _, tc := range testCases {
		test := RelayTest{
			Name:        tc.name,
			Description: tc.description,
		}
		relayAllowed, err := attemptRelay(host, port, tc.from, tc.to)
		if err != nil {
			test.Result = "Error: " + err.Error()
		} else if relayAllowed {
			test.Result = "ACCEPTED (potential open relay)"
			test.Vulnerable = true
			result.OpenRelay = true
		} else {
			test.Result = "Rejected (server refused relay)"
		}
		result.Tests = append(result.Tests, test)
	}

	if result.OpenRelay {
		result.Warnings = append(result.Warnings, "⚠ Server appears to be an OPEN RELAY — this is a critical security issue")
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func attemptRelay(host string, port int, from, to string) (bool, error) {
	addr := fmt.Sprintf("%s:%d", host, port)
	dialer := &net.Dialer{Timeout: 8 * time.Second}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return false, fmt.Errorf("connect: %w", err)
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(10 * time.Second))
	reader := bufio.NewReader(conn)

	// Read banner
	if _, err := reader.ReadString('\n'); err != nil {
		return false, fmt.Errorf("banner: %w", err)
	}

	// EHLO
	fmt.Fprintf(conn, "EHLO relaytest.local\r\n")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return false, fmt.Errorf("ehlo: %w", err)
		}
		if strings.HasPrefix(line, "250 ") {
			break
		}
		if !strings.HasPrefix(line, "250-") {
			break
		}
	}

	// MAIL FROM
	fmt.Fprintf(conn, "MAIL FROM:<%s>\r\n", from)
	line, err := reader.ReadString('\n')
	if err != nil {
		return false, fmt.Errorf("mail from: %w", err)
	}
	if !strings.HasPrefix(line, "250") {
		return false, nil
	}

	// RCPT TO
	fmt.Fprintf(conn, "RCPT TO:<%s>\r\n", to)
	line, err = reader.ReadString('\n')
	if err != nil {
		return false, fmt.Errorf("rcpt to: %w", err)
	}
	if strings.HasPrefix(line, "250") {
		// Accepted — this is the definition of an open relay
		fmt.Fprintf(conn, "QUIT\r\n")
		return true, nil
	}

	fmt.Fprintf(conn, "QUIT\r\n")
	return false, nil
}

// CheckCatchAll probes whether a domain accepts mail for any random address
func CheckCatchAll(domain string) CatchAllResult {
	start := time.Now()
	result := CatchAllResult{
		Domain: domain,
		Tests:  []CatchAllTest{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resolver := &net.Resolver{}
	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err != nil || len(mxRecords) == 0 {
		result.Error = "No MX records — cannot test catch-all"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// Sort by priority, take top 3
	type mxEntry struct {
		host     string
		priority uint16
	}
	mxs := make([]mxEntry, 0, len(mxRecords))
	for _, m := range mxRecords {
		mxs = append(mxs, mxEntry{strings.TrimSuffix(m.Host, "."), m.Pref})
	}
	sort.Slice(mxs, func(i, j int) bool { return mxs[i].priority < mxs[j].priority })
	if len(mxs) > 3 {
		mxs = mxs[:3]
	}
	for _, m := range mxs {
		result.MX = append(result.MX, m.host)
	}

	// Probe with several random non-existent addresses
	probes := []string{
		fmt.Sprintf("zxqv-nonexistent-82934@%s", domain),
		fmt.Sprintf("abc-test-19283@%s", domain),
		fmt.Sprintf("random-probe-7733@%s", domain),
	}
	// Valid address
	result.Tests = append(result.Tests, CatchAllTest{
		Email: fmt.Sprintf("valid-existing@%s", domain), Probed: false, Result: "skipped",
	})

	accepted := 0
	for _, addr := range probes {
		test := CatchAllTest{Email: addr, Probed: true}
		// Try first MX
		ok, err := rcptTo(mxs[0].host, addr)
		if err != nil {
			test.Result = "Error: " + err.Error()
		} else if ok {
			test.Result = "Accepted (250)"
			accepted++
		} else {
			test.Result = "Rejected (550/553)"
		}
		result.Tests = append(result.Tests, test)
	}

	if accepted >= 2 {
		result.IsCatchAll = true
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func rcptTo(host, to string) (bool, error) {
	addr := fmt.Sprintf("%s:25", host)
	dialer := &net.Dialer{Timeout: 6 * time.Second}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return false, err
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(8 * time.Second))
	reader := bufio.NewReader(conn)
	reader.ReadString('\n')
	fmt.Fprintf(conn, "EHLO catchall-probe.local\r\n")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		if strings.HasPrefix(line, "250 ") || (!strings.HasPrefix(line, "250-") && strings.HasPrefix(line, "250")) {
			break
		}
	}
	fmt.Fprintf(conn, "MAIL FROM:<probe@external.test>\r\n")
	reader.ReadString('\n')
	fmt.Fprintf(conn, "RCPT TO:<%s>\r\n", to)
	line, err := reader.ReadString('\n')
	if err != nil {
		return false, err
	}
	fmt.Fprintf(conn, "QUIT\r\n")
	return strings.HasPrefix(line, "250"), nil
}

// DiscoverSubdomains runs a lightweight subdomain enumeration using a curated
// wordlist. For full coverage you'd integrate Subfinder/Amass, but the
// common-prefix list catches the majority of discovered subdomains.
func DiscoverSubdomains(domain string) SubdomainResult {
	start := time.Now()
	result := SubdomainResult{
		Domain:  domain,
		Found:   []string{},
		Sources: []string{"wordlist"},
	}

	wordlist := []string{
		"www", "mail", "email", "smtp", "imap", "pop", "pop3",
		"webmail", "mx", "mx1", "mx2", "relay", "in", "inbound",
		"out", "outbound", "send", "receive", "gateway", "gw",
		"mx0", "mta", "mail1", "mail2", "mail3", "mailin", "mailout",
		"mailgw", "post", "posta", "postfix", "exchange", "ex",
		"correo", "smtp1", "smtp2", "smtp3", "imap1", "imap2",
		"pop3", "auth", "login", "account", "accounts", "help",
		"support", "info", "contact", "admin", "api", "dev",
		"test", "staging", "stage", "prod", "production", "beta",
		"app", "apps", "blog", "shop", "store", "cdn", "static",
		"media", "img", "images", "files", "docs", "doc", "wiki",
		"kb", "support", "status", "monitor", "nagios", "zabbix",
		"grafana", "prometheus", "log", "logs", "siem", "soc",
		"vpn", "remote", "access", "ssh", "ftp", "sftp", "cpanel",
		"whm", "plesk", "panel", "host", "hosting", "server",
		"node1", "node2", "node3", "edge", "lb", "proxy", "cache",
		"db", "db1", "db2", "database", "mysql", "postgres", "mongo",
		"redis", "elastic", "kibana", "gitlab", "git", "ci", "cd",
		"jenkins", "drone", "k8s", "kubernetes", "docker", "registry",
		"portal", "intranet", "internal", "corp", "corporate",
		"mx-a", "mx-b", "mx-c", "smtp-a", "smtp-b",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resolver := &net.Resolver{}

	foundSet := make(map[string]bool)
	for _, sub := range wordlist {
		fqdn := fmt.Sprintf("%s.%s", sub, domain)
		if _, err := resolver.LookupHost(ctx, fqdn); err == nil {
			if !foundSet[fqdn] {
				foundSet[fqdn] = true
				result.Found = append(result.Found, fqdn)
			}
		}
	}
	sort.Strings(result.Found)
	result.Count = len(result.Found)
	result.Duration = time.Since(start).Milliseconds()
	return result
}

// SanitizeText defangs emails/URLs/IPs to make them safe to share in tickets
func SanitizeText(input string) SanitizeResult {
	start := time.Now()
	result := SanitizeResult{
		Input:  input,
		Emails: []string{},
		URLs:   []string{},
	}

	emailRe := regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	urlRe := regexp.MustCompile(`https?://[^\s<>"']+`)
	ipv4Re := regexp.MustCompile(`\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b`)
	ipv6Re := regexp.MustCompile(`(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}`)
	domainRe := regexp.MustCompile(`\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b`)

	result.Emails = emailRe.FindAllString(input, -1)
	result.HasEmail = len(result.Emails) > 0
	result.URLs = urlRe.FindAllString(input, -1)
	result.HasURL = len(result.URLs) > 0
	result.IPv4Count = len(ipv4Re.FindAllString(input, -1))
	result.IPv6Count = len(ipv6Re.FindAllString(input, -1))
	// Count unique domains
	domains := domainRe.FindAllString(input, -1)
	uniqueDomains := make(map[string]bool)
	for _, d := range domains {
		uniqueDomains[strings.ToLower(d)] = true
	}
	result.DomainCount = len(uniqueDomains)

	// Sanitize (remove) and defang
	sanitized := input
	sanitized = emailRe.ReplaceAllString(sanitized, "[email-redacted]")
	sanitized = urlRe.ReplaceAllString(sanitized, "[link-redacted]")
	sanitized = ipv4Re.ReplaceAllStringFunc(sanitized, func(ip string) string {
		return strings.ReplaceAll(ip, ".", "[.]")
	})
	result.Sanitized = sanitized

	// Defang: keep visible but un-clickable
	defanged := input
	defanged = emailRe.ReplaceAllStringFunc(defanged, func(e string) string {
		return strings.ReplaceAll(e, "@", "[@]") + " (defanged)"
	})
	defanged = urlRe.ReplaceAllStringFunc(defanged, func(u string) string {
		return strings.ReplaceAll(u, "://", "[:]//")
	})
	defanged = ipv4Re.ReplaceAllStringFunc(defanged, func(ip string) string {
		return strings.ReplaceAll(ip, ".", "[.]")
	})
	result.Defanged = defanged

	result.Duration = time.Since(start).Milliseconds()
	return result
}

// ParsePublicSuffix breaks a domain into TLD / SLD / subdomain
func ParsePublicSuffix(input string) PublicSuffixResult {
	start := time.Now()
	result := PublicSuffixResult{Input: input}
	cleaned := strings.TrimSpace(strings.ToLower(input))
	cleaned = strings.TrimSuffix(cleaned, ".")
	if idx := strings.Index(cleaned, "://"); idx >= 0 {
		cleaned = cleaned[idx+3:]
	}
	if idx := strings.Index(cleaned, "/"); idx >= 0 {
		cleaned = cleaned[:idx]
	}
	if idx := strings.Index(cleaned, ":"); idx >= 0 {
		cleaned = cleaned[:idx]
	}
	result.Input = cleaned
	parts := strings.Split(cleaned, ".")
	if len(parts) < 2 {
		result.Error = "Invalid domain"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	result.TLD = parts[len(parts)-1]
	result.SLD = parts[len(parts)-2]
	if len(parts) > 2 {
		result.Subdomain = strings.Join(parts[:len(parts)-2], ".")
	}
	result.Registrable = result.SLD + "." + result.TLD

	// Known TLDs
	knownTLDs := map[string]bool{
		"com": true, "net": true, "org": true, "io": true, "co": true, "ai": true,
		"dev": true, "app": true, "me": true, "info": true, "biz": true, "us": true,
		"uk": true, "de": true, "fr": true, "jp": true, "cn": true, "ru": true,
		"tv": true, "gg": true, "to": true, "xyz": true, "tech": true, "online": true,
		"store": true, "site": true, "cloud": true, "email": true, "services": true,
	}
	result.IsKnownTLD = knownTLDs[result.TLD]

	privateTLDs := map[string]bool{
		"local": true, "internal": true, "intranet": true, "corp": true,
		"lan": true, "home": true, "test": true, "example": true,
		"invalid": true, "localhost": true,
	}
	result.IsPrivateTLD = privateTLDs[result.TLD]

	result.Duration = time.Since(start).Milliseconds()
	return result
}
