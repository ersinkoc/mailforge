package tools

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

func InspectHTTPHeaders(url string) HTTPHeaderResult {
	start := time.Now()
	result := HTTPHeaderResult{
		URL:        url,
		AllHeaders: map[string]string{},
		Security:   []SecurityHeader{},
	}

	// Normalize URL
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
		result.URL = url
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid URL: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	req.Header.Set("User-Agent", "MailForge/2.0")

	client := getHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		result.Error = fmt.Sprintf("Request failed: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	defer resp.Body.Close()

	result.Reachable = true
	result.StatusCode = resp.StatusCode
	result.StatusText = http.StatusText(resp.StatusCode)
	result.Server = resp.Header.Get("Server")
	result.ContentType = resp.Header.Get("Content-Type")
	result.HSTS = resp.Header.Get("Strict-Transport-Security") != ""
	result.HSTSValue = resp.Header.Get("Strict-Transport-Security")
	result.XFrameOptions = resp.Header.Get("X-Frame-Options")
	result.CSP = resp.Header.Get("Content-Security-Policy")
	result.XPoweredBy = resp.Header.Get("X-Powered-By")

	for k, v := range resp.Header {
		result.AllHeaders[k] = strings.Join(v, ", ")
	}

	// Security headers evaluation
	checks := []struct {
		name        string
		header      string
		recommended string
	}{
		{"Strict-Transport-Security", "Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"},
		{"Content-Security-Policy", "Content-Security-Policy", "default-src 'self'"},
		{"X-Frame-Options", "X-Frame-Options", "DENY or SAMEORIGIN"},
		{"X-Content-Type-Options", "X-Content-Type-Options", "nosniff"},
		{"Referrer-Policy", "Referrer-Policy", "strict-origin-when-cross-origin"},
		{"Permissions-Policy", "Permissions-Policy", "geolocation=(), microphone=()"},
		{"X-XSS-Protection", "X-XSS-Protection", "0 (modern recommendation)"},
		{"X-Permitted-Cross-Domain-Policies", "X-Permitted-Cross-Domain-Policies", "none"},
	}

	score := 0
	for _, c := range checks {
		val := resp.Header.Get(c.header)
		sh := SecurityHeader{
			Name:        c.name,
			Present:     val != "",
			Value:       val,
			Recommended: c.recommended,
		}
		if !sh.Present {
			sh.Status = "bad"
		} else {
			sh.Status = "good"
			score += 12
		}
		result.Security = append(result.Security, sh)
	}

	// Penalize for "Server" / "X-Powered-By" disclosure
	if result.Server != "" {
		score -= 3
	}
	if result.XPoweredBy != "" {
		score -= 5
	}

	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	result.Score = score
	result.Grade = scoreToGrade(score)
	result.Duration = time.Since(start).Milliseconds()
	return result
}

// CheckDNSPropagation queries a domain's A record from multiple public resolvers
func CheckDNSPropagation(domain string) PropagationResult {
	start := time.Now()
	result := PropagationResult{
		Domain: domain,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	servers := []PropagationServer{
		{Server: "8.8.8.8", Location: "Google DNS (US)"},
		{Server: "1.1.1.1", Location: "Cloudflare (Global)"},
		{Server: "9.9.9.9", Location: "Quad9 (Switzerland)"},
		{Server: "208.67.222.222", Location: "OpenDNS (US)"},
		{Server: "77.88.8.8", Location: "Yandex (Russia)"},
		{Server: "180.76.76.76", Location: "Baidu (China)"},
		{Server: "4.2.2.1", Location: "Level3 (US)"},
		{Server: "199.85.126.10", Location: "Norton (US)"},
	}

	valuesByServer := make(map[string][]string)
	for i := range servers {
		s := &servers[i]
		t0 := time.Now()
		resolver := &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{Timeout: 4 * time.Second}
				return d.DialContext(ctx, "udp", s.Server+":53")
			},
		}
		ips, err := resolver.LookupIP(ctx, "ip", domain)
		s.Latency = time.Since(t0).Milliseconds()
		if err == nil {
			s.Reached = true
			for _, ip := range ips {
				if ip4 := ip.To4(); ip4 != nil {
					s.Values = append(s.Values, ip4.String())
				} else {
					s.Values = append(s.Values, ip.String())
				}
			}
			valuesByServer[s.Server] = s.Values
		}
	}
	result.Servers = servers

	// Determine consistency
	reference := valuesByServer[servers[0].Server]
	result.Record = strings.Join(reference, ", ")
	consistent := true
	for _, vals := range valuesByServer {
		if !equalStringSets(reference, vals) {
			consistent = false
			break
		}
	}
	result.Consistent = consistent

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func equalStringSets(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	count := make(map[string]int)
	for _, v := range a {
		count[v]++
	}
	for _, v := range b {
		count[v]--
	}
	for _, c := range count {
		if c != 0 {
			return false
		}
	}
	return true
}
