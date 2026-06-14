package tools

// MX Lookup Models
type MXLookupResult struct {
	Domain   string      `json:"domain"`
	MX       []MXDetail  `json:"mx,omitempty"`
	Warn     string      `json:"warn,omitempty"`
	Error    string      `json:"error,omitempty"`
	Duration int64       `json:"duration_ms"`
}

type MXDetail struct {
	Host       string   `json:"host"`
	Priority   uint16   `json:"priority"`
	IPs        []string `json:"ips,omitempty"`
	Valid      bool     `json:"valid"`
}

// DNS Lookup Models
type MXRecord struct {
	Host     string `json:"host"`
	Priority uint16 `json:"priority"`
}

type ARecord struct {
	IP string `json:"ip"`
}

type AAAARecord struct {
	IP string `json:"ip"`
}

type TXTRecord struct {
	Text string `json:"text"`
}

type NSRecord struct {
	Host string `json:"host"`
}

type SOARecord struct {
	NS      string `json:"ns"`
	MBox    string `json:"mbox"`
	Serial  uint32 `json:"serial"`
	Refresh uint32 `json:"refresh"`
	Retry   uint32 `json:"retry"`
	Expire  uint32 `json:"expire"`
	Minttl  uint32 `json:"minttl"`
}

type CNAMERecord struct {
	Target string `json:"target"`
}

type DNSLookupResult struct {
	Domain    string       `json:"domain"`
	MX        []MXRecord  `json:"mx,omitempty"`
	A         []ARecord   `json:"a,omitempty"`
	AAAA      []AAAARecord `json:"aaaa,omitempty"`
	TXT       []TXTRecord  `json:"txt,omitempty"`
	NS        []NSRecord   `json:"ns,omitempty"`
	SOA       *SOARecord   `json:"soa,omitempty"`
	CNAME     *CNAMERecord `json:"cname,omitempty"`
	PTR       []string     `json:"ptr,omitempty"`
	Warn      string       `json:"warn,omitempty"`
	Error     string       `json:"error,omitempty"`
	Duration  int64        `json:"duration_ms"`
}

// Blacklist Check Models
type BlacklistEntry struct {
	Name     string `json:"name"`
	Listed   bool   `json:"listed"`
	Response string `json:"response,omitempty"`
	Error    string `json:"error,omitempty"`
}

type BlacklistResult struct {
	IP       string            `json:"ip"`
	Lists    []BlacklistEntry  `json:"lists"`
	Listed   int               `json:"listed_count"`
	Clean    int               `json:"clean_count"`
	Total    int               `json:"total_count"`
	Error    string            `json:"error,omitempty"`
	Duration int64             `json:"duration_ms"`
}

// SPF Models
type SPFResult struct {
	Domain       string   `json:"domain"`
	Record       string   `json:"record"`
	Valid        bool     `json:"valid"`
	Warnings     []string `json:"warnings"`
	Errors       []string `json:"errors"`
	DNSLookups   int      `json:"dns_lookups"`
	MaxLookups   int      `json:"max_lookups"`
	Mechanisms   []SPFMechanism `json:"mechanisms"`
	Error        string   `json:"error,omitempty"`
	Duration     int64    `json:"duration_ms"`
}

type SPFMechanism struct {
	Type        string `json:"type"`
	Value       string `json:"value"`
	Description string `json:"description"`
}

// DKIM Models
type DKIMResult struct {
	Domain      string   `json:"domain"`
	Selector    string   `json:"selector"`
	Record      string   `json:"record"`
	Valid       bool     `json:"valid"`
	KeyType     string   `json:"key_type,omitempty"`
	KeySize     int      `json:"key_size,omitempty"`
	Flags       string   `json:"flags,omitempty"`
	ServiceType string   `json:"service_type,omitempty"`
	Notes       string   `json:"notes,omitempty"`
	Warnings    []string `json:"warnings,omitempty"`
	Error       string   `json:"error,omitempty"`
	Duration    int64    `json:"duration_ms"`
}

// DMARC Models
type DMARCResult struct {
	Domain       string         `json:"domain"`
	Record       string         `json:"record"`
	Valid        bool           `json:"valid"`
	Policy       string         `json:"policy,omitempty"`
	SubPolicy    string         `json:"sub_policy,omitempty"`
	Percent      int            `json:"percent,omitempty"`
	RUA          string         `json:"rua,omitempty"`
	RUF          string         `json:"ruf,omitempty"`
	ADKIM        string         `json:"adkim,omitempty"`
	ASPF         string         `json:"aspf,omitempty"`
	SpfDomain    string         `json:"spf_domain,omitempty"`
	DkimDomain   string         `json:"dkim_domain,omitempty"`
	Aggregate    []string       `json:"aggregate,omitempty"`
	Forensic     []string       `json:"forensic,omitempty"`
	Warnings     []string       `json:"warnings,omitempty"`
	Errors       []string       `json:"errors,omitempty"`
	Error        string         `json:"error,omitempty"`
	Duration     int64          `json:"duration_ms"`
}

// SMTP Test Models
type SMTPTestResult struct {
	Host        string          `json:"host"`
	Port        int             `json:"port"`
	Connected   bool            `json:"connected"`
	Banner      string          `json:"banner,omitempty"`
	STARTTLS    bool            `json:"starttls"`
	AuthMethods []string        `json:"auth_methods,omitempty"`
	IP          string          `json:"ip,omitempty"`
	TLSVersion  string          `json:"tls_version,omitempty"`
	Certificate *TLSCertificate `json:"certificate,omitempty"`
	Error       string          `json:"error,omitempty"`
	Duration    int64           `json:"duration_ms"`
}

type TLSCertificate struct {
	Subject  string `json:"subject"`
	Issuer   string `json:"issuer"`
	NotAfter string `json:"not_after"`
	Serial   string `json:"serial"`
}

// Port Scanner Models
type PortScanResult struct {
	Host  string     `json:"host"`
	IP    string     `json:"ip"`
	Ports []PortInfo `json:"ports"`
	Error string     `json:"error,omitempty"`
	Duration int64  `json:"duration_ms"`
}

type PortInfo struct {
	Port   int    `json:"port"`
	State  string `json:"state"`
	Name   string `json:"name"`
	Banner string `json:"banner,omitempty"`
}

// Reverse DNS Models
type ReverseDNSResult struct {
	IP       string   `json:"ip"`
	Hosts    []string `json:"hosts"`
	Error    string   `json:"error,omitempty"`
	Duration int64    `json:"duration_ms"`
}

// Email Header Models
type HeaderAnalysisResult struct {
	From        string            `json:"from"`
	To          string            `json:"to"`
	Subject     string            `json:"subject"`
	Date        string            `json:"date"`
	MessageID   string            `json:"message_id"`
	Headers     map[string]string `json:"headers"`
	Routing     []RoutingHop      `json:"routing"`
	AuthResults map[string]string `json:"auth_results"`
	Warnings    []string          `json:"warnings"`
	Errors      []string          `json:"errors"`
	Error       string            `json:"error,omitempty"`
}

type RoutingHop struct {
	Hop     int    `json:"hop"`
	From    string `json:"from"`
	To      string `json:"to"`
	Date    string `json:"date"`
	Delay   string `json:"delay,omitempty"`
	Server  string `json:"server,omitempty"`
}

// WHOIS Models
type WhoisResult struct {
	Domain     string            `json:"domain"`
	Server     string            `json:"server,omitempty"`
	Registrar  string            `json:"registrar,omitempty"`
	CreatedAt  string            `json:"created_at,omitempty"`
	UpdatedAt  string            `json:"updated_at,omitempty"`
	ExpiresAt  string            `json:"expires_at,omitempty"`
	NameServers []string         `json:"name_servers,omitempty"`
	Details    map[string]string `json:"details,omitempty"`
	Cached     bool              `json:"cached,omitempty"`
	Error      string            `json:"error,omitempty"`
	Duration   int64             `json:"duration_ms"`
}

