package tools

// ── Email Validator ──────────────────────────────────────────
type EmailValidationResult struct {
	Email        string       `json:"email"`
	User         string       `json:"user"`
	Domain       string       `json:"domain"`
	FormatValid  bool         `json:"format_valid"`
	MXPresent    bool         `json:"mx_present"`
	MXRecords    []string     `json:"mx_records,omitempty"`
	Disposable   bool         `json:"disposable"`
	RoleBased    bool         `json:"role_based"`
	FreeProvider bool         `json:"free_provider"`
	HasGravatar  bool         `json:"has_gravatar"`
	Suggestion   string       `json:"suggestion,omitempty"`
	Checks       []EmailCheck `json:"checks"`
	Score        int          `json:"score"`
	Risk         string       `json:"risk"`
	Duration     int64        `json:"duration_ms"`
	Error        string       `json:"error,omitempty"`
}

type EmailCheck struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Message string `json:"message"`
	Weight  int    `json:"weight"`
}

// ── IP Geolocation ───────────────────────────────────────────
type IPGeoResult struct {
	IP          string  `json:"ip"`
	Country     string  `json:"country"`
	CountryCode string  `json:"country_code"`
	Region      string  `json:"region"`
	City        string  `json:"city"`
	Postal      string  `json:"postal"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Timezone    string  `json:"timezone"`
	ISP         string  `json:"isp"`
	Org         string  `json:"org"`
	ASN         int     `json:"asn"`
	ASNOrg      string  `json:"asn_org"`
	Reverse     string  `json:"reverse,omitempty"`
	IsVPN       bool    `json:"is_vpn"`
	IsProxy     bool    `json:"is_proxy"`
	IsTor       bool    `json:"is_tor"`
	IsHosting   bool    `json:"is_hosting"`
	Threat      string  `json:"threat_level"`
	Duration    int64   `json:"duration_ms"`
	Error       string  `json:"error,omitempty"`
}

// ── TLS / SSL Inspector ──────────────────────────────────────
type TLSInspectResult struct {
	Host        string       `json:"host"`
	Port        int          `json:"port"`
	Reachable   bool         `json:"reachable"`
	Version     string       `json:"tls_version,omitempty"`
	Cipher      string       `json:"cipher,omitempty"`
	ALPN        []string     `json:"alpn,omitempty"`
	Certificate *CertDetail  `json:"certificate,omitempty"`
	Chain       []CertDetail `json:"chain,omitempty"`
	OCSPStapled bool         `json:"ocsp_stapled"`
	Issues      []TLSIssue   `json:"issues"`
	Grade       string       `json:"grade"`
	Score       int          `json:"score"`
	HSTS        bool         `json:"hsts"`
	Duration    int64        `json:"duration_ms"`
	Error       string       `json:"error,omitempty"`
}

type CertDetail struct {
	Subject      string   `json:"subject"`
	Issuer       string   `json:"issuer"`
	Serial       string   `json:"serial"`
	NotBefore    string   `json:"not_before"`
	NotAfter     string   `json:"not_after"`
	DaysLeft     int      `json:"days_left"`
	SANs         []string `json:"sans,omitempty"`
	KeyAlg       string   `json:"key_alg"`
	KeyBits      int      `json:"key_bits"`
	SignatureAlg string   `json:"signature_alg"`
	SelfSigned   bool     `json:"self_signed"`
	Expired      bool     `json:"expired"`
	Valid        bool     `json:"valid"`
	Fingerprint  string   `json:"fingerprint_sha256,omitempty"`
}

type TLSIssue struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

// ── Email Deliverability Score ───────────────────────────────
type DeliverabilityResult struct {
	Domain          string         `json:"domain"`
	Score           int            `json:"score"`
	Grade           string         `json:"grade"`
	SPF             ComponentCheck `json:"spf"`
	DKIM            ComponentCheck `json:"dkim"`
	DMARC           ComponentCheck `json:"dmarc"`
	MTASTS          ComponentCheck `json:"mtasts"`
	TLReporting     ComponentCheck `json:"tlsrpt"`
	BIMI            ComponentCheck `json:"bimi"`
	DNSSEC          ComponentCheck `json:"dnssec"`
	Blacklist       ComponentCheck `json:"blacklist"`
	Recommendations []string       `json:"recommendations"`
	Duration        int64          `json:"duration_ms"`
}

type ComponentCheck struct {
	Name    string `json:"name"`
	Present bool   `json:"present"`
	Valid   bool   `json:"valid"`
	Score   int    `json:"score"`
	Detail  string `json:"detail,omitempty"`
}

// ── MTA-STS ──────────────────────────────────────────────────
type MTASTSResult struct {
	Domain      string   `json:"domain"`
	Policy      string   `json:"policy,omitempty"`
	Mode        string   `json:"mode,omitempty"`
	MX          []string `json:"mx,omitempty"`
	MaxAge      int      `json:"max_age,omitempty"`
	Valid       bool     `json:"valid"`
	FetchedFrom string   `json:"fetched_from,omitempty"`
	Warnings    []string `json:"warnings,omitempty"`
	Errors      []string `json:"errors,omitempty"`
	Duration    int64    `json:"duration_ms"`
	Error       string   `json:"error,omitempty"`
}

// ── TLS-RPT ──────────────────────────────────────────────────
type TLSRPTResult struct {
	Domain   string   `json:"domain"`
	Version  string   `json:"version,omitempty"`
	RUAs     []string `json:"rua,omitempty"`
	Valid    bool     `json:"valid"`
	Warnings []string `json:"warnings,omitempty"`
	Duration int64    `json:"duration_ms"`
	Error    string   `json:"error,omitempty"`
}

// ── BIMI ─────────────────────────────────────────────────────
type BIMIResult struct {
	Domain    string   `json:"domain"`
	Version   string   `json:"version,omitempty"`
	Location  string   `json:"location,omitempty"`
	Authority string   `json:"authority,omitempty"`
	Valid     bool     `json:"valid"`
	Warnings  []string `json:"warnings,omitempty"`
	Duration  int64    `json:"duration_ms"`
	Error     string   `json:"error,omitempty"`
}

// ── DNSSEC ───────────────────────────────────────────────────
type DNSSECResult struct {
	Domain     string   `json:"domain"`
	Secure     bool     `json:"secure"`
	HasDS      bool     `json:"has_ds"`
	HasDNSKEY  bool     `json:"has_dnskey"`
	HasRRSIG   bool     `json:"has_rrsig"`
	Algorithm  string   `json:"algorithm,omitempty"`
	KeyTag     int      `json:"key_tag,omitempty"`
	Digest     string   `json:"digest,omitempty"`
	DigestType string   `json:"digest_type,omitempty"`
	Warnings   []string `json:"warnings,omitempty"`
	Duration   int64    `json:"duration_ms"`
	Error      string   `json:"error,omitempty"`
}

// ── SMTP Open Relay Test ─────────────────────────────────────
type RelayTestResult struct {
	Host      string      `json:"host"`
	Port      int         `json:"port"`
	OpenRelay bool        `json:"open_relay"`
	Tests     []RelayTest `json:"tests"`
	Warnings  []string    `json:"warnings,omitempty"`
	Duration  int64       `json:"duration_ms"`
	Error     string      `json:"error,omitempty"`
}

type RelayTest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Result      string `json:"result"`
	Vulnerable  bool   `json:"vulnerable"`
}

// ── Catch-all Detection ──────────────────────────────────────
type CatchAllResult struct {
	Domain     string         `json:"domain"`
	IsCatchAll bool           `json:"is_catch_all"`
	Tests      []CatchAllTest `json:"tests"`
	MX         []string       `json:"mx,omitempty"`
	Duration   int64          `json:"duration_ms"`
	Error      string         `json:"error,omitempty"`
}

type CatchAllTest struct {
	Email  string `json:"email"`
	Probed bool   `json:"probed"`
	Result string `json:"result"`
}

// ── ASN Lookup ───────────────────────────────────────────────
type ASNLookupResult struct {
	IP        string   `json:"ip"`
	ASN       int      `json:"asn"`
	ASNName   string   `json:"asn_name"`
	Country   string   `json:"country"`
	Registry  string   `json:"registry"`
	CIDR      string   `json:"cidr"`
	Allocated string   `json:"allocated,omitempty"`
	Prefixes  []string `json:"prefixes,omitempty"`
	Duration  int64    `json:"duration_ms"`
	Error     string   `json:"error,omitempty"`
}

// ── Subdomain Discovery ──────────────────────────────────────
type SubdomainResult struct {
	Domain   string   `json:"domain"`
	Found    []string `json:"found"`
	Count    int      `json:"count"`
	Sources  []string `json:"sources"`
	Duration int64    `json:"duration_ms"`
	Error    string   `json:"error,omitempty"`
}

// ── DNS Propagation ──────────────────────────────────────────
type PropagationResult struct {
	Domain     string              `json:"domain"`
	Record     string              `json:"record"`
	Servers    []PropagationServer `json:"servers"`
	Consistent bool                `json:"consistent"`
	Duration   int64               `json:"duration_ms"`
	Error      string              `json:"error,omitempty"`
}

type PropagationServer struct {
	Server   string   `json:"server"`
	Location string   `json:"location"`
	Values   []string `json:"values"`
	Reached  bool     `json:"reached"`
	Latency  int64    `json:"latency_ms"`
}

// ── Email Sanitizer / Defanger ───────────────────────────────
type SanitizeResult struct {
	Input       string   `json:"input"`
	Sanitized   string   `json:"sanitized"`
	Defanged    string   `json:"defanged"`
	HasEmail    bool     `json:"has_email"`
	HasURL      bool     `json:"has_url"`
	Emails      []string `json:"emails,omitempty"`
	URLs        []string `json:"urls,omitempty"`
	IPv4Count   int      `json:"ipv4_count"`
	IPv6Count   int      `json:"ipv6_count"`
	DomainCount int      `json:"domain_count"`
	Duration    int64    `json:"duration_ms"`
}

// ── Public Suffix ────────────────────────────────────────────
type PublicSuffixResult struct {
	Input        string `json:"input"`
	TLD          string `json:"tld"`
	SLD          string `json:"sld"`
	Subdomain    string `json:"subdomain,omitempty"`
	Registrable  string `json:"registrable"`
	IsKnownTLD   bool   `json:"is_known_tld"`
	IsPrivateTLD bool   `json:"is_private_tld"`
	Duration     int64  `json:"duration_ms"`
	Error        string `json:"error,omitempty"`
}

// ── HTTP Headers Inspector ───────────────────────────────────
type HTTPHeaderResult struct {
	URL           string            `json:"url"`
	Reachable     bool              `json:"reachable"`
	StatusCode    int               `json:"status_code"`
	StatusText    string            `json:"status_text"`
	Server        string            `json:"server,omitempty"`
	ContentType   string            `json:"content_type,omitempty"`
	HSTS          bool              `json:"hsts"`
	HSTSValue     string            `json:"hsts_value,omitempty"`
	XFrameOptions string            `json:"x_frame_options,omitempty"`
	CSP           string            `json:"csp,omitempty"`
	XPoweredBy    string            `json:"x_powered_by,omitempty"`
	Security      []SecurityHeader  `json:"security_headers"`
	AllHeaders    map[string]string `json:"all_headers"`
	Score         int               `json:"score"`
	Grade         string            `json:"grade"`
	Duration      int64             `json:"duration_ms"`
	Error         string            `json:"error,omitempty"`
}

type SecurityHeader struct {
	Name        string `json:"name"`
	Present     bool   `json:"present"`
	Value       string `json:"value,omitempty"`
	Recommended string `json:"recommended,omitempty"`
	Status      string `json:"status"` // good | warning | bad | info
}

// ── Aggregate deliverability ─────────────────────────────────
type DomainScore struct {
	Domain         string `json:"domain"`
	Overall        int    `json:"overall"`
	Grade          string `json:"grade"`
	SPF            int    `json:"spf"`
	DKIM           int    `json:"dkim"`
	DMARC          int    `json:"dmarc"`
	MTASTS         int    `json:"mtasts"`
	TLSRPT         int    `json:"tlsrpt"`
	BIMI           int    `json:"bimi"`
	DNSSEC         int    `json:"dnssec"`
	Blacklist      int    `json:"blacklist"`
	Recommendation string `json:"recommendation"`
}
