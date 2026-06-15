package api

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mailforge/internal/tools"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// isPrivateOrLocalhost checks if the given host is a private IP, localhost, or link-local.
// This prevents SSRF attacks where internal resources could be probed.
func isPrivateOrLocalhost(host string) bool {
	// Check for localhost and common local hostnames
	lowerHost := strings.ToLower(host)
	if lowerHost == "localhost" || lowerHost == "localhost.localdomain" {
		return true
	}
	if strings.HasSuffix(lowerHost, ".local") || strings.HasSuffix(lowerHost, ".internal") {
		return true
	}

	// Parse IP address
	ip := net.ParseIP(host)
	if ip == nil {
		// Not an IP - could be a hostname. Allow public hostnames.
		return false
	}

	// Check private IP ranges
	// 10.0.0.0/8
	if ip.IsPrivate() {
		return true
	}
	// 172.16.0.0/12 (check manually - IsPrivate() may vary)
	if b := ip.To4(); b != nil {
		if b[0] == 172 && b[1] >= 16 && b[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if b[0] == 192 && b[1] == 168 {
			return true
		}
		// 127.0.0.0/8
		if b[0] == 127 {
			return true
		}
	}
	// IPv6 loopback/link-local
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return true
	}

	return false
}

type Server struct {
	mux           *http.ServeMux
	fileServer    http.Handler
	staticContent fs.FS
	rateLimiter   *RateLimiter
}

func NewRouter(staticFS embed.FS) *http.Server {
	s := &Server{
		mux:         http.NewServeMux(),
		rateLimiter: NewRateLimiter(240, time.Minute), // 240 req/min per client IP (4 req/sec)
	}

	// Setup static file serving with SPA fallback
	if content, err := fs.Sub(staticFS, "web/dist"); err == nil {
		s.fileServer = http.FileServer(http.FS(content))
		s.staticContent = content
	} else {
		log.Printf("⚠️  Could not embed static files: %v (frontend not built yet?)", err)
	}

	s.routes()

	// Apply middleware chain only to /api/ routes
	apiHandler := Chain(s.mux, CORSMiddleware, s.rateLimiter.RateLimitMiddleware, s.metricsMiddleware, LoggingMiddleware)
	// mux is already routing-aware; we wrap it as a handler.
	wrapped := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/ws/monitor" {
			apiHandler.ServeHTTP(w, r)
			return
		}
		s.mux.ServeHTTP(w, r)
	})

	return &http.Server{
		Addr:    ":8181",
		Handler: wrapped,
	}
}

func (s *Server) metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		tool := strings.TrimPrefix(r.URL.Path, "/api/")
		if idx := strings.Index(tool, "/"); idx > 0 {
			tool = tool[:idx]
		}
		if tool == "" {
			tool = "root"
		}
		err := rw.status >= 400
		globalMetrics.record(tool, time.Since(start), boolPtr(err))
	})
}

func boolPtr(b bool) error {
	if b {
		return fmt.Errorf("status error: %t", b)
	}
	return nil
}

func (s *Server) routes() {
	if s.fileServer != nil {
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/" {
				cleanPath := strings.TrimPrefix(r.URL.Path, "/")
				if cleanPath != "" {
					if _, err := fs.Stat(s.staticContent, cleanPath); err == nil {
						s.fileServer.ServeHTTP(w, r)
						return
					}
				}
			}
			r.URL.Path = "/"
			s.fileServer.ServeHTTP(w, r)
		})
	} else {
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Frontend not built. Run: cd web && npm run build",
			})
		})
	}

	// WebSocket
	s.mux.HandleFunc("/ws/monitor", HandleMonitorWS)

	// All API endpoints (handleAPI does the routing)
	s.mux.HandleFunc("/api/", s.handleAPI)
}

func (s *Server) handleAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	path := strings.TrimPrefix(r.URL.Path, "/api/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"service":     "MailForge API",
			"version":     "1.0.0",
			"description": "Comprehensive email infrastructure diagnostic suite",
			"endpoints":   endpointCatalog(),
			"websocket":   []string{"ws /ws/monitor"},
		})
		return
	}

	tool := parts[0]

	// ── Universal endpoints ──
	if tool == "health" {
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"status":  "healthy",
			"time":    time.Now().UTC().Format(time.RFC3339),
			"version": "1.0.0",
			"uptime":  int64(time.Since(globalMetrics.StartTime).Seconds()),
		})
		return
	}

	if tool == "metrics" {
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    globalMetrics.snapshot(),
		})
		return
	}

	if tool == "openapi" {
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success":   true,
			"openapi":   "3.0.3",
			"info":      map[string]string{"title": "MailForge API", "version": "1.0.0"},
			"endpoints": endpointCatalog(),
		})
		return
	}

	if tool == "monitors" {
		s.handleMonitors(w, r, parts)
		return
	}

	if tool == "batch" {
		s.handleBatch(w, r)
		return
	}

	// ── Tool endpoints ──
	switch tool {
	case "dns":
		s.requireArg(parts, w, "Domain required: /api/dns/{domain}", func() {
			r := tools.LookupDNS(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "mx":
		s.requireArg(parts, w, "Domain required: /api/mx/{domain}", func() {
			r := tools.LookupMX(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "blacklist":
		s.requireArg(parts, w, "IP required: /api/blacklist/{ip}", func() {
			r := tools.CheckBlacklist(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "spf":
		s.requireArg(parts, w, "Domain required: /api/spf/{domain}", func() {
			r := tools.CheckSPF(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "dkim":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Domain required: /api/dkim/{domain}/{selector}")
			return
		}
		sel := "default"
		if len(parts) >= 3 {
			sel = parts[2]
		}
		r := tools.CheckDKIM(parts[1], sel)
		s.sendJSON(w, http.StatusOK, wrap(r))
	case "dmarc":
		s.requireArg(parts, w, "Domain required: /api/dmarc/{domain}", func() {
			r := tools.CheckDMARC(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "smtp":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Host required: /api/smtp/{host}/{port}")
			return
		}
		port := 25
		if len(parts) >= 3 {
			fmt.Sscanf(parts[2], "%d", &port)
		}
		r := tools.TestSMTP(parts[1], port)
		s.sendJSON(w, http.StatusOK, wrap(r))
	case "scan":
		s.handlePortScan(w, r, parts)
	case "rdns":
		s.requireArg(parts, w, "IP required: /api/rdns/{ip}", func() {
			r := tools.ReverseDNS(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "whois":
		s.handleWhois(w, r, parts)
	case "header":
		s.handleHeader(w, r)
	case "super":
		s.handleSuper(w, parts)
	case "email":
		s.requireArg(parts, w, "Email required: /api/email/{addr}", func() {
			r := tools.ValidateEmail(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "geo":
		s.requireArg(parts, w, "IP required: /api/geo/{ip}", func() {
			r := tools.LookupIPGeo(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "tls":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Host required: /api/tls/{host}/{port}")
			return
		}
		port := 443
		if len(parts) >= 3 {
			fmt.Sscanf(parts[2], "%d", &port)
		}
		r := tools.InspectTLS(parts[1], port)
		s.sendJSON(w, http.StatusOK, wrap(r))
	case "http":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "URL required: /api/http/{url...}")
			return
		}
		urlStr := strings.Join(parts[1:], "/")
		if !strings.HasPrefix(urlStr, "http") {
			urlStr = "https://" + urlStr
		}

		// SSRF protection: validate the target host
		parsedURL, err := url.Parse(urlStr)
		if err != nil || parsedURL.Host == "" {
			s.sendError(w, http.StatusBadRequest, "Invalid URL")
			return
		}
		host := parsedURL.Hostname()
		if isPrivateOrLocalhost(host) {
			s.sendError(w, http.StatusForbidden, "Cannot probe internal or private hosts")
			return
		}

		r := tools.InspectHTTPHeaders(urlStr)
		s.sendJSON(w, http.StatusOK, wrap(r))
	case "mtasts":
		s.requireArg(parts, w, "Domain required: /api/mtasts/{domain}", func() {
			r := tools.CheckMTASTS(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "tlsrpt":
		s.requireArg(parts, w, "Domain required: /api/tlsrpt/{domain}", func() {
			r := tools.CheckTLSRPT(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "bimi":
		s.requireArg(parts, w, "Domain required: /api/bimi/{domain}", func() {
			r := tools.CheckBIMI(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "dnssec":
		s.requireArg(parts, w, "Domain required: /api/dnssec/{domain}", func() {
			r := tools.CheckDNSSEC(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "deliverability":
		s.requireArg(parts, w, "Domain required: /api/deliverability/{domain}", func() {
			r := tools.ComputeDeliverability(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "relay":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Host required: /api/relay/{host}/{port}")
			return
		}
		port := 25
		if len(parts) >= 3 {
			fmt.Sscanf(parts[2], "%d", &port)
		}
		r := tools.TestOpenRelay(parts[1], port)
		s.sendJSON(w, http.StatusOK, wrap(r))
	case "catchall":
		s.requireArg(parts, w, "Domain required: /api/catchall/{domain}", func() {
			r := tools.CheckCatchAll(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "subdomains":
		s.requireArg(parts, w, "Domain required: /api/subdomains/{domain}", func() {
			r := tools.DiscoverSubdomains(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "propagation":
		s.requireArg(parts, w, "Domain required: /api/propagation/{domain}", func() {
			r := tools.CheckDNSPropagation(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "sanitize":
		if r.Method != "POST" {
			s.sendError(w, http.StatusBadRequest, "POST required with {\"text\": \"...\"}")
			return
		}
		var req struct {
			Text string `json:"text"`
		}
		// Limit body to 1MB to prevent memory exhaustion
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			s.sendError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}
		san := tools.SanitizeText(req.Text)
		s.sendJSON(w, http.StatusOK, wrap(san))
	case "tld":
		s.requireArg(parts, w, "Domain required: /api/tld/{domain}", func() {
			r := tools.ParsePublicSuffix(parts[1])
			s.sendJSON(w, http.StatusOK, wrap(r))
		})
	case "dkim-discover":
		// Run a sweep of common selectors
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Domain required: /api/dkim-discover/{domain}")
			return
		}
		s.runDKIMDiscover(w, parts[1])

	default:
		s.sendError(w, http.StatusNotFound, fmt.Sprintf("Unknown tool: %s", tool))
	}
}

func (s *Server) requireArg(parts []string, w http.ResponseWriter, msg string, fn func()) {
	if len(parts) < 2 || parts[1] == "" {
		s.sendError(w, http.StatusBadRequest, msg)
		return
	}
	fn()
}

func wrap(d interface{}) map[string]interface{} {
	return map[string]interface{}{"success": true, "data": d}
}

func (s *Server) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *Server) sendError(w http.ResponseWriter, status int, message string) {
	s.sendJSON(w, status, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

func (s *Server) handlePortScan(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) < 2 {
		s.sendError(w, http.StatusBadRequest, "Host required: /api/scan/{host}")
		return
	}
	ports := []int{}
	if len(parts) >= 3 {
		for _, p := range strings.Split(parts[2], ",") {
			port := 0
			fmt.Sscanf(p, "%d", &port)
			if port > 0 && port < 65536 {
				ports = append(ports, port)
			}
		}
	}
	res := tools.ScanPorts(parts[1], ports)
	s.sendJSON(w, http.StatusOK, wrap(res))
}

func (s *Server) handleWhois(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) < 2 || parts[1] == "" {
		stats := tools.WhoisCacheStats()
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": true, "data": stats,
		})
		return
	}
	if err := tools.ValidateDomain(parts[1]); err != nil {
		s.sendError(w, http.StatusBadRequest, err.Error())
		return
	}
	refresh := r.URL.Query().Get("refresh") == "true"
	res := tools.CheckWhois(parts[1], refresh)
	s.sendJSON(w, http.StatusOK, wrap(res))
}

func (s *Server) handleHeader(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		s.sendError(w, http.StatusBadRequest, "POST required with {\"header\": \"...\"}")
		return
	}
	var req struct {
		Header string `json:"header"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}
	res := tools.AnalyzeHeader(req.Header)
	s.sendJSON(w, http.StatusOK, wrap(res))
}

func (s *Server) handleSuper(w http.ResponseWriter, parts []string) {
	if len(parts) < 2 {
		s.sendError(w, http.StatusBadRequest, "Input required: /api/super/{domain-or-ip}")
		return
	}
	input := parts[1]
	results := make(map[string]interface{})

	isIP := net.ParseIP(input) != nil && strings.Contains(input, ".") && !strings.Contains(input, ":")
	if isIP {
		isIPv4 := net.ParseIP(input).To4() != nil
		if isIPv4 {
			results["blacklist"] = tools.CheckBlacklist(input)
		}
		results["rdns"] = tools.ReverseDNS(input)
		results["scan"] = tools.ScanPorts(input, nil)
		results["geo"] = tools.LookupIPGeo(input)
	} else {
		results["dns"] = tools.LookupDNS(input)
		results["spf"] = tools.CheckSPF(input)
		results["dmarc"] = tools.CheckDMARC(input)
		results["blacklist"] = tools.CheckBlacklist(input)
		results["deliverability"] = tools.ComputeDeliverability(input)
	}

	s.sendJSON(w, http.StatusOK, wrap(results))
}

func (s *Server) handleBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		s.sendError(w, http.StatusBadRequest, "POST required with {\"tool\": \"...\", \"targets\": [\"...\"]}")
		return
	}
	var req struct {
		Tool    string   `json:"tool"`
		Targets []string `json:"targets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}
	if req.Tool == "" || len(req.Targets) == 0 {
		s.sendError(w, http.StatusBadRequest, "Both 'tool' and 'targets' are required")
		return
	}
	if len(req.Targets) > 50 {
		s.sendError(w, http.StatusBadRequest, "Maximum 50 targets per batch")
		return
	}

	results := make([]map[string]interface{}, 0, len(req.Targets))
	for _, target := range req.Targets {
		entry := map[string]interface{}{"target": target, "success": true}
		switch req.Tool {
		case "dns":
			entry["result"] = tools.LookupDNS(target)
		case "mx":
			entry["result"] = tools.LookupMX(target)
		case "blacklist":
			entry["result"] = tools.CheckBlacklist(target)
		case "spf":
			entry["result"] = tools.CheckSPF(target)
		case "dmarc":
			entry["result"] = tools.CheckDMARC(target)
		case "rdns":
			entry["result"] = tools.ReverseDNS(target)
		case "deliverability":
			entry["result"] = tools.ComputeDeliverability(target)
		case "whois":
			if err := tools.ValidateDomain(target); err == nil {
				entry["result"] = tools.CheckWhois(target, false)
			} else {
				entry["success"] = false
				entry["error"] = err.Error()
			}
		default:
			entry["success"] = false
			entry["error"] = "unknown tool"
		}
		results = append(results, entry)
	}
	s.sendJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"tool":    req.Tool,
		"count":   len(results),
		"data":    results,
	})
}

func (s *Server) handleMonitors(w http.ResponseWriter, r *http.Request, parts []string) {
	switch r.Method {
	case "GET":
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    ListMonitors(),
		})
	case "POST":
		var entry MonitorEntry
		if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
			s.sendError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}
		if entry.Value == "" || entry.Tool == "" {
			s.sendError(w, http.StatusBadRequest, "'value' and 'tool' are required")
			return
		}
		AddMonitor(&entry)
		// Return a copy without the mutex to avoid vet warning about copying lock
		s.sendJSON(w, http.StatusCreated, map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"id":          entry.ID,
				"name":        entry.Name,
				"type":        entry.Type,
				"tool":        entry.Tool,
				"value":       entry.Value,
				"interval":    entry.Interval,
				"last_status": entry.LastStatus,
				"last_check":  entry.LastCheck,
			},
		})
	case "DELETE":
		if len(parts) < 2 {
			s.sendError(w, http.StatusBadRequest, "Monitor ID required: /api/monitors/{id}")
			return
		}
		if !RemoveMonitor(parts[1]) {
			s.sendError(w, http.StatusNotFound, "Monitor not found")
			return
		}
		s.sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Monitor removed",
		})
	default:
		s.sendError(w, http.StatusMethodNotAllowed, "GET, POST, DELETE only")
	}
}

func (s *Server) runDKIMDiscover(w http.ResponseWriter, domain string) {
	selectors := []string{
		"default", "google", "selector1", "selector2", "k1", "s1", "s2",
		"dkim", "mail", "email", "key1", "key2", "mandrill", "smtp",
		"everlytickey1", "everlytickey2", "20230601", "20161025",
	}
	results := []map[string]interface{}{}
	for _, sel := range selectors {
		r := tools.CheckDKIM(domain, sel)
		results = append(results, map[string]interface{}{
			"selector": sel,
			"valid":    r.Valid,
			"record":   r.Record,
			"error":    r.Error,
		})
	}
	s.sendJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"domain":  domain,
		"count":   len(results),
		"data":    results,
	})
}

func endpointCatalog() []string {
	return []string{
		"GET  /api/health",
		"GET  /api/metrics",
		"GET  /api/openapi",
		"GET  /api/monitors  | POST | DELETE",
		"POST /api/batch",
		"GET  /api/dns/{domain}",
		"GET  /api/mx/{domain}",
		"GET  /api/blacklist/{ip}",
		"GET  /api/spf/{domain}",
		"GET  /api/dkim/{domain}/{selector}",
		"GET  /api/dkim-discover/{domain}",
		"GET  /api/dmarc/{domain}",
		"GET  /api/smtp/{host}/{port}",
		"GET  /api/scan/{host}",
		"GET  /api/scan/{host}/{ports}",
		"GET  /api/rdns/{ip}",
		"GET  /api/whois/{domain}",
		"GET  /api/whois/stats",
		"POST /api/header",
		"GET  /api/super/{domain-or-ip}",
		"GET  /api/email/{addr}",
		"GET  /api/geo/{ip}",
		"GET  /api/tls/{host}/{port}",
		"GET  /api/http/{url}",
		"GET  /api/mtasts/{domain}",
		"GET  /api/tlsrpt/{domain}",
		"GET  /api/bimi/{domain}",
		"GET  /api/dnssec/{domain}",
		"GET  /api/deliverability/{domain}",
		"GET  /api/relay/{host}/{port}",
		"GET  /api/catchall/{domain}",
		"GET  /api/subdomains/{domain}",
		"GET  /api/propagation/{domain}",
		"GET  /api/tld/{domain}",
		"POST /api/sanitize",
		"WS   /ws/monitor",
	}
}
