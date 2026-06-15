package tools

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// WHOIS Cache
const whoisCacheTTL = 24 * time.Hour
const whoisCacheMaxSize = 1000

type whoisCacheEntry struct {
	result   WhoisResult
	cachedAt time.Time
}

var whoisCache = struct {
	sync.RWMutex
	entries map[string]*whoisCacheEntry
}{
	entries: make(map[string]*whoisCacheEntry),
}

// WHOIS Cache Statistics (lock-free using atomic counters)
var whoisCacheHits uint64
var whoisCacheMisses uint64

func getWhoisCacheKey(domain string) string {
	return strings.ToLower(strings.TrimSpace(domain))
}

func getFromWhoisCache(domain string) *WhoisResult {
	key := getWhoisCacheKey(domain)
	whoisCache.RLock()
	entry, ok := whoisCache.entries[key]
	// Copy needed fields before releasing the lock to prevent race with setWhoisCache
	var result WhoisResult
	var cachedAt time.Time
	if ok {
		result = entry.result
		cachedAt = entry.cachedAt
	}
	whoisCache.RUnlock()

	if !ok || time.Since(cachedAt) > whoisCacheTTL {
		atomic.AddUint64(&whoisCacheMisses, 1)
		return nil
	}
	atomic.AddUint64(&whoisCacheHits, 1)
	result.Cached = true
	return &result
}

func setWhoisCache(domain string, result WhoisResult) {
	key := getWhoisCacheKey(domain)
	whoisCache.Lock()
	defer whoisCache.Unlock()
	// Evict oldest if at capacity
	if len(whoisCache.entries) >= whoisCacheMaxSize {
		var oldestKey string
		var oldestTime time.Time
		for k, v := range whoisCache.entries {
			if oldestKey == "" || v.cachedAt.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.cachedAt
			}
		}
		if oldestKey != "" {
			delete(whoisCache.entries, oldestKey)
		}
	}
	whoisCache.entries[key] = &whoisCacheEntry{
		result:   result,
		cachedAt: time.Now(),
	}
}

// ValidateDomain checks if the input is a valid domain name
func ValidateDomain(domain string) error {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		return fmt.Errorf("domain cannot be empty")
	}

	// Remove protocol prefix if present
	if strings.HasPrefix(domain, "http://") {
		domain = strings.TrimPrefix(domain, "http://")
	} else if strings.HasPrefix(domain, "https://") {
		domain = strings.TrimPrefix(domain, "https://")
	}

	// Remove trailing slash and path
	if idx := strings.Index(domain, "/"); idx != -1 {
		domain = domain[:idx]
	}

	// Remove port if present
	if idx := strings.Index(domain, ":"); idx != -1 {
		domain = domain[:idx]
	}

	// Remove trailing dot (FQDN)
	domain = strings.TrimSuffix(domain, ".")

	if domain == "" {
		return fmt.Errorf("invalid domain format")
	}

	// Must contain at least one dot
	if !strings.Contains(domain, ".") {
		return fmt.Errorf("domain must contain at least one dot (e.g. example.com)")
	}

	// Check total length
	if len(domain) > 253 {
		return fmt.Errorf("domain name too long (max 253 characters)")
	}

	// Validate each label
	labels := strings.Split(domain, ".")
	labelRegex := regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

	for _, label := range labels {
		if label == "" {
			return fmt.Errorf("domain contains empty label")
		}
		if len(label) > 63 {
			return fmt.Errorf("domain label too long: '%s' (max 63 characters)", label)
		}
		if !labelRegex.MatchString(strings.ToLower(label)) {
			return fmt.Errorf("invalid domain label: '%s' (only alphanumeric and hyphens allowed)", label)
		}
	}

	// TLD must be at least 2 chars
	tld := labels[len(labels)-1]
	if len(tld) < 2 {
		return fmt.Errorf("TLD must be at least 2 characters")
	}

	return nil
}

// Known WHOIS servers for common TLDs (fallback if IANA lookup fails)
var knownWhoisServers = map[string]string{
	// Generic TLDs
	"com":    "whois.verisign-grs.com",
	"net":    "whois.verisign-grs.com",
	"org":    "whois.pir.org",
	"info":   "whois.afilias.net",
	"biz":    "whois.biz",
	"name":   "whois.nic.name",
	"pro":    "whois.nic.pro",
	"mobi":   "whois.afilias.net",
	"asia":   "whois.nic.asia",
	"tel":    "whois.nic.tel",
	"coop":   "whois.nic.coop",
	"aero":   "whois.nic.aero",
	"cat":    "whois.nic.cat",
	"jobs":   "whois.nic.jobs",
	"museum": "whois.museum",

	// Country-code TLDs — Americas
	"us": "whois.nic.us",
	"ca": "whois.cira.ca",
	"br": "whois.registro.br",
	"mx": "whois.nic.mx",
	"ar": "whois.nic.ar",
	"cl": "whois.nic.cl",
	"co": "whois.nic.co",
	"ve": "whois.nic.ve",
	"pe": "whois.nic.pe",
	"ec": "whois.nic.ec",
	"cr": "whois.nic.cr",
	"pa": "whois.nic.pa",
	"pr": "whois.nic.pr",
	"do": "whois.nic.do",
	"cu": "whois.nic.cu",
	"gt": "whois.nic.gt",
	"hn": "whois.nic.hn",
	"sv": "whois.nic.sv",
	"ni": "whois.nic.ni",
	"bo": "whois.nic.bo",
	"py": "whois.nic.py",
	"uy": "whois.nic.uy",

	// Country-code TLDs — Europe
	"uk": "whois.nic.uk",
	"de": "whois.denic.de",
	"fr": "whois.nic.fr",
	"nl": "whois.sidn.nl",
	"eu": "whois.eu",
	"it": "whois.nic.it",
	"es": "whois.nic.es",
	"pt": "whois.dns.pt",
	"pl": "whois.dns.pl",
	"cz": "whois.nic.cz",
	"se": "whois.iis.se",
	"no": "whois.norid.no",
	"fi": "whois.fi",
	"dk": "whois.dk-hostmaster.dk",
	"at": "whois.nic.at",
	"ch": "whois.nic.ch",
	"be": "whois.dns.be",
	"ie": "whois.iedr.ie",
	"ro": "whois.rotld.ro",
	"hu": "whois.nic.hu",
	"gr": "whois.gr",
	"bg": "whois.register.bg",
	"hr": "whois.dns.hr",
	"si": "whois.arnes.si",
	"sk": "whois.sk-nic.sk",
	"lt": "whois.domreg.lt",
	"lv": "whois.nic.lv",
	"ee": "whois.tld.ee",
	"rs": "whois.rnids.rs",
	"ba": "whois.nic.ba",
	"me": "whois.nic.me",
	"mk": "whois.marnet.mk",
	"al": "whois.akdn.al",
	"cy": "whois.nic.cy",
	"mt": "whois.nic.org.mt",
	"lu": "whois.dns.lu",
	"is": "whois.isnic.is",
	"li": "whois.nic.li",
	"ad": "whois.nic.ad",
	"mc": "whois.nic.mc",
	"sm": "whois.nic.sm",
	"va": "whois.nic.va",

	// Country-code TLDs — Asia & Oceania
	"au": "whois.auda.org.au",
	"nz": "whois.srs.net.nz",
	"za": "whois.registry.net.za",
	"cn": "whois.cnnic.cn",
	"hk": "whois.hkirc.hk",
	"tw": "whois.twnic.net.tw",
	"jp": "whois.jprs.jp",
	"kr": "whois.kr",
	"sg": "whois.sgnic.sg",
	"in": "whois.inregistry.net",
	"th": "whois.thnic.co.th",
	"ph": "whois.dot.ph",
	"id": "whois.id",
	"my": "whois.mynic.my",
	"pk": "whois.pknic.net.pk",
	"ng": "whois.nic.net.ng",
	"ke": "whois.kenic.or.ke",
	"il": "whois.isoc.org.il",
	"ir": "whois.nic.ir",
	"sa": "whois.nic.net.sa",
	"ae": "whois.nic.ae",
	"qa": "whois.nic.qa",
	"kw": "whois.nic.kw",
	"fj": "whois.fiji.domains",
	"pg": "whois.nic.org.pg",
	"mo": "whois.monic.mo",

	// Country-code TLDs — Central Asia & Caucasus
	"kz": "whois.nic.kz",
	"uz": "whois.cctld.uz",
	"kg": "whois.domain.kg",
	"tj": "whois.nic.tj",
	"tm": "whois.nic.tm",
	"az": "whois.nic.az",
	"ge": "whois.nic.ge",
	"am": "whois.amnic.net",
	"by": "whois.cctld.by",
	"md": "whois.nic.md",

	// Country-code TLDs — Small territories & islands
	"gi": "whois.afilias-srs.net",
	"im": "whois.nic.im",
	"je": "whois.je",
	"gg": "whois.gg",
	"fo": "whois.nic.fo",
	"gl": "whois.nic.gl",
	"pm": "whois.nic.pm",
	"tf": "whois.nic.tf",
	"wf": "whois.nic.wf",
	"yt": "whois.nic.yt",
	"re": "whois.nic.re",
	"tk": "whois.nic.tk",
	"pw": "whois.nic.pw",
	"cc": "whois.nic.cc",
	"cx": "whois.nic.cx",
	"nu": "whois.nic.nu",
	"sh": "whois.nic.sh",
	"ac": "whois.nic.ac",
	"io": "whois.nic.io",
	"vg": "whois.adamsnames.vg",
	"tc": "whois.nic.tc",
	"sc": "whois.nic.sc",
	"bz": "whois.belizenic.bz",
	"dm": "whois.nic.dm",
	"ag": "whois.nic.ag",
	"ai": "whois.nic.ai",
	"bm": "whois.nic.bm",
	"ky": "whois.nic.ky",
	"ms": "whois.nic.ms",
	"kn": "whois.nic.kn",
	"lc": "whois.nic.lc",
	"vc": "whois.nic.vc",
	"bb": "whois.nic.bb",
	"tt": "whois.nic.tt",
	"gs": "whois.nic.gs",
	"kp": "whois.kptc.kp",
	"mn": "whois.nic.mn",

	// Turkish second-level domains (TLD is .tr)
	"tr":        "whois.trabis.gov.tr",
	"com.tr":    "whois.trabis.gov.tr",
	"org.tr":    "whois.trabis.gov.tr",
	"net.tr":    "whois.trabis.gov.tr",
	"web.tr":    "whois.trabis.gov.tr",
	"gen.tr":    "whois.trabis.gov.tr",
	"edu.tr":    "whois.trabis.gov.tr",
	"gov.tr":    "whois.trabis.gov.tr",
	"mil.tr":    "whois.trabis.gov.tr",
	"bir.tr":    "whois.trabis.gov.tr",
	"cop.tr":    "whois.trabis.gov.tr",
	"dr.tr":     "whois.trabis.gov.tr",
	"pol.tr":    "whois.trabis.gov.tr",
	"bel.tr":    "whois.trabis.gov.tr",
	"tsk.tr":    "whois.trabis.gov.tr",
	"k12.tr":    "whois.trabis.gov.tr",
	"info.tr":   "whois.trabis.gov.tr",
	"nc.tr":     "whois.trabis.gov.tr",
	"gov.nc.tr": "whois.trabis.gov.tr",

	// UK second-level domains
	"co.uk":  "whois.nic.uk",
	"org.uk": "whois.nic.uk",
	"net.uk": "whois.nic.uk",
	"me.uk":  "whois.nic.uk",
	"ltd.uk": "whois.nic.uk",
	"plc.uk": "whois.nic.uk",

	// Japanese second-level domains
	"co.jp":   "whois.jprs.jp",
	"or.jp":   "whois.jprs.jp",
	"ne.jp":   "whois.jprs.jp",
	"go.jp":   "whois.jprs.jp",
	"ad.jp":   "whois.jprs.jp",
	"ac.jp":   "whois.jprs.jp",
	"gr.jp":   "whois.jprs.jp",
	"lg.jp":   "whois.jprs.jp",
	"geo.jp":  "whois.jprs.jp",
	"kids.jp": "whois.jprs.jp",

	// Korean second-level domains
	"co.kr":       "whois.kr",
	"or.kr":       "whois.kr",
	"ne.kr":       "whois.kr",
	"re.kr":       "whois.kr",
	"pe.kr":       "whois.kr",
	"go.kr":       "whois.kr",
	"mil.kr":      "whois.kr",
	"ac.kr":       "whois.kr",
	"hs.kr":       "whois.kr",
	"ms.kr":       "whois.kr",
	"es.kr":       "whois.kr",
	"seoul.kr":    "whois.kr",
	"busan.kr":    "whois.kr",
	"daegu.kr":    "whois.kr",
	"incheon.kr":  "whois.kr",
	"gwangju.kr":  "whois.kr",
	"daejeon.kr":  "whois.kr",
	"ulsan.kr":    "whois.kr",
	"gyeonggi.kr": "whois.kr",

	// Australian second-level domains
	"com.au":   "whois.auda.org.au",
	"net.au":   "whois.auda.org.au",
	"org.au":   "whois.auda.org.au",
	"edu.au":   "whois.auda.org.au",
	"gov.au":   "whois.auda.org.au",
	"csiro.au": "whois.auda.org.au",
	"id.au":    "whois.auda.org.au",

	// New Zealand second-level domains
	"co.nz":    "whois.srs.net.nz",
	"net.nz":   "whois.srs.net.nz",
	"org.nz":   "whois.srs.net.nz",
	"maori.nz": "whois.srs.net.nz",

	// Brazilian second-level domains
	"com.br":  "whois.registro.br",
	"net.br":  "whois.registro.br",
	"org.br":  "whois.registro.br",
	"edu.br":  "whois.registro.br",
	"gov.br":  "whois.registro.br",
	"mil.br":  "whois.registro.br",
	"adv.br":  "whois.registro.br",
	"agr.br":  "whois.registro.br",
	"am.br":   "whois.registro.br",
	"art.br":  "whois.registro.br",
	"atm.br":  "whois.registro.br",
	"bio.br":  "whois.registro.br",
	"blog.br": "whois.registro.br",
	"bmd.br":  "whois.registro.br",
	"cim.br":  "whois.registro.br",
	"cng.br":  "whois.registro.br",
	"cnt.br":  "whois.registro.br",
	"coop.br": "whois.registro.br",
	"ecn.br":  "whois.registro.br",
	"eng.br":  "whois.registro.br",
	"esp.br":  "whois.registro.br",
	"etc.br":  "whois.registro.br",
	"eti.br":  "whois.registro.br",
	"far.br":  "whois.registro.br",
	"flog.br": "whois.registro.br",
	"fm.br":   "whois.registro.br",
	"fnd.br":  "whois.registro.br",
	"fot.br":  "whois.registro.br",
	"fst.br":  "whois.registro.br",
	"g12.br":  "whois.registro.br",
	"geo.br":  "whois.registro.br",
	"ggr.br":  "whois.registro.br",
	"gro.br":  "whois.registro.br",
	"guj.br":  "whois.registro.br",
	"hosp.br": "whois.registro.br",
	"imb.br":  "whois.registro.br",
	"ind.br":  "whois.registro.br",
	"inf.br":  "whois.registro.br",
	"jor.br":  "whois.registro.br",
	"jus.br":  "whois.registro.br",
	"leg.br":  "whois.registro.br",
	"lel.br":  "whois.registro.br",
	"mat.br":  "whois.registro.br",
	"med.br":  "whois.registro.br",
	"mus.br":  "whois.registro.br",
	"nom.br":  "whois.registro.br",
	"ntr.br":  "whois.registro.br",
	"odo.br":  "whois.registro.br",
	"ong.br":  "whois.registro.br",
	"ppg.br":  "whois.registro.br",
	"pro.br":  "whois.registro.br",
	"psc.br":  "whois.registro.br",
	"psi.br":  "whois.registro.br",
	"qsl.br":  "whois.registro.br",
	"rec.br":  "whois.registro.br",
	"slg.br":  "whois.registro.br",
	"tmp.br":  "whois.registro.br",
	"tur.br":  "whois.registro.br",
	"tv.br":   "whois.registro.br",
	"vet.br":  "whois.registro.br",
	"vix.br":  "whois.registro.br",
	"wleg.br": "whois.registro.br",
	"xml.br":  "whois.registro.br",

	// Chinese second-level domains
	"com.cn": "whois.cnnic.cn",
	"net.cn": "whois.cnnic.cn",
	"org.cn": "whois.cnnic.cn",
	"gov.cn": "whois.cnnic.cn",
	"ac.cn":  "whois.cnnic.cn",
	"edu.cn": "whois.cnnic.cn",
	"mil.cn": "whois.cnnic.cn",
	"id.cn":  "whois.cnnic.cn",

	// Colombian second-level domains
	"com.co": "whois.nic.co",
	"net.co": "whois.nic.co",
	"nom.co": "whois.nic.co",
	"org.co": "whois.nic.co",

	// Mexican second-level domains
	"com.mx": "whois.nic.mx",
	"net.mx": "whois.nic.mx",
	"org.mx": "whois.nic.mx",

	// South African second-level domains
	"co.za":  "whois.registry.net.za",
	"net.za": "whois.registry.net.za",
	"org.za": "whois.registry.net.za",
	"web.za": "whois.registry.net.za",

	// Indian second-level domains
	"co.in":   "whois.inregistry.net",
	"net.in":  "whois.inregistry.net",
	"org.in":  "whois.inregistry.net",
	"gen.in":  "whois.inregistry.net",
	"ind.in":  "whois.inregistry.net",
	"firm.in": "whois.inregistry.net",
	"ac.in":   "whois.inregistry.net",
	"edu.in":  "whois.inregistry.net",
	"res.in":  "whois.inregistry.net",

	// Singapore second-level domains
	"com.sg": "whois.sgnic.sg",
	"net.sg": "whois.sgnic.sg",
	"org.sg": "whois.sgnic.sg",
	"edu.sg": "whois.sgnic.sg",
	"gov.sg": "whois.sgnic.sg",

	// Hong Kong second-level domains
	"com.hk": "whois.hkirc.hk",
	"net.hk": "whois.hkirc.hk",
	"org.hk": "whois.hkirc.hk",
	"edu.hk": "whois.hkirc.hk",
	"gov.hk": "whois.hkirc.hk",
	"idv.hk": "whois.hkirc.hk",

	// Taiwan second-level domains
	"com.tw": "whois.twnic.net.tw",
	"net.tw": "whois.twnic.net.tw",
	"org.tw": "whois.twnic.net.tw",
	"idv.tw": "whois.twnic.net.tw",
	"gov.tw": "whois.twnic.net.tw",
	"edu.tw": "whois.twnic.net.tw",
	"mil.tw": "whois.twnic.net.tw",

	// Argentine second-level domains
	"com.ar": "whois.nic.ar",
	"net.ar": "whois.nic.ar",
	"org.ar": "whois.nic.ar",
	"gob.ar": "whois.nic.ar",
	"gov.ar": "whois.nic.ar",
	"int.ar": "whois.nic.ar",
	"mil.ar": "whois.nic.ar",
	"edu.ar": "whois.nic.ar",

	// Chilean second-level domains
	"com.cl": "whois.nic.cl",
	"net.cl": "whois.nic.cl",
	"org.cl": "whois.nic.cl",
	"gob.cl": "whois.nic.cl",
	"gov.cl": "whois.nic.cl",
	"mil.cl": "whois.nic.cl",

	// Venezuelan second-level domains
	"com.ve":  "whois.nic.ve",
	"net.ve":  "whois.nic.ve",
	"org.ve":  "whois.nic.ve",
	"co.ve":   "whois.nic.ve",
	"info.ve": "whois.nic.ve",
	"web.ve":  "whois.nic.ve",
	"gob.ve":  "whois.nic.ve",
	"gov.ve":  "whois.nic.ve",
	"edu.ve":  "whois.nic.ve",

	// Peruvian second-level domains
	"com.pe": "whois.nic.pe",
	"net.pe": "whois.nic.pe",
	"org.pe": "whois.nic.pe",
	"gob.pe": "whois.nic.pe",
	"edu.pe": "whois.nic.pe",

	// Thai second-level domains
	"co.th":  "whois.thnic.co.th",
	"ac.th":  "whois.thnic.co.th",
	"go.th":  "whois.thnic.co.th",
	"in.th":  "whois.thnic.co.th",
	"mi.th":  "whois.thnic.co.th",
	"net.th": "whois.thnic.co.th",
	"or.th":  "whois.thnic.co.th",

	// Indonesian second-level domains
	"co.id":  "whois.id",
	"net.id": "whois.id",
	"org.id": "whois.id",
	"ac.id":  "whois.id",
	"go.id":  "whois.id",
	"sch.id": "whois.id",
	"web.id": "whois.id",
	"mil.id": "whois.id",
	"biz.id": "whois.id",
}

// queryWhois connects to a WHOIS server and returns the raw response
func queryWhois(ctx context.Context, server, query string) (string, error) {
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", server+":43")
	if err != nil {
		return "", fmt.Errorf("failed to connect to %s: %w", server, err)
	}
	defer conn.Close()

	// Set read/write deadline
	conn.SetDeadline(time.Now().Add(10 * time.Second))

	fmt.Fprintf(conn, "%s\r\n", query)

	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var response strings.Builder
	for scanner.Scan() {
		response.WriteString(scanner.Text() + "\n")
	}

	return response.String(), nil
}

// getWhoisServer uses IANA to find the correct WHOIS server for a TLD
func getWhoisServer(domain string) string {
	// Extract TLD (handle compound TLDs like .com.tr, .co.uk)
	tld := extractTLD(domain)
	tld = strings.ToLower(tld)

	// Check known map first (faster, no extra network call)
	if server, ok := knownWhoisServers[tld]; ok {
		return server
	}

	// Fallback: query IANA to discover the WHOIS server
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	response, err := queryWhois(ctx, "whois.iana.org", tld)
	if err != nil {
		// Ultimate fallback
		return "whois.iana.org"
	}

	// Parse "refer:        whois.example.com" from IANA response
	for _, line := range strings.Split(response, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToLower(line), "refer:") {
			server := strings.TrimSpace(strings.TrimPrefix(line, "refer:"))
			server = strings.TrimSpace(strings.TrimPrefix(server, "Refer:"))
			if server != "" {
				return server
			}
		}
	}

	return "whois.iana.org"
}

// parseWhoisField extracts a field value from WHOIS response lines.
// Handles both standard WHOIS formats and TRABIS (.tr) format where
// field names are padded with dots: "Created on..............: 2007-Jan-08."
func parseWhoisField(line string, prefixes ...string) string {
	lineTrimmed := strings.TrimSpace(line)
	lineLower := strings.ToLower(lineTrimmed)

	for _, prefix := range prefixes {
		prefixLower := strings.ToLower(prefix)

		// Standard format: "Created on: value" or "created on: value"
		if strings.HasPrefix(lineLower, prefixLower) {
			idx := strings.Index(lineTrimmed, ":")
			if idx >= 0 {
				val := strings.TrimSpace(lineTrimmed[idx+1:])
				// TRABIS format: values end with trailing period (e.g., "2007-Jan-08.")
				val = strings.TrimRight(val, ".")
				return val
			}
		}

		// TRABIS dot-padded format: "Created on..............: value"
		// The prefix in the raw data ends with "." before the colon (e.g., "Created on..............:")
		// Check if line starts with prefix followed by dots and colon
		// e.g., prefix="Created on." matches "Created on..............: 2007-Jan-08."
		dotPaddedPrefix := prefixLower
		if strings.HasPrefix(lineLower, dotPaddedPrefix) {
			// Find the colon that follows the dot-padding
			idx := strings.Index(lineTrimmed, ":")
			if idx >= 0 {
				val := strings.TrimSpace(lineTrimmed[idx+1:])
				// TRABIS format: values end with trailing period (e.g., "2007-Jan-08.")
				val = strings.TrimRight(val, ".")
				return val
			}
		}
	}
	return ""
}

// WhoisCacheStats returns current cache statistics
func WhoisCacheStats() map[string]interface{} {
	whoisCache.RLock()
	size := len(whoisCache.entries)
	var totalAge time.Duration
	var count int
	for _, entry := range whoisCache.entries {
		totalAge += time.Since(entry.cachedAt)
		count++
	}
	whoisCache.RUnlock()

	hits := atomic.LoadUint64(&whoisCacheHits)
	misses := atomic.LoadUint64(&whoisCacheMisses)

	var avgAge float64
	if count > 0 {
		avgAge = totalAge.Seconds() / float64(count)
	}

	var hitRate float64
	total := hits + misses
	if total > 0 {
		hitRate = float64(hits) / float64(total) * 100
	}

	return map[string]interface{}{
		"size":      size,
		"max_size":  whoisCacheMaxSize,
		"hits":      hits,
		"misses":    misses,
		"hit_rate":  hitRate,
		"avg_age_s": avgAge,
		"ttl_hours": whoisCacheTTL.Hours(),
	}
}

func CheckWhois(domain string, refresh bool) WhoisResult {
	start := time.Now()
	result := WhoisResult{
		Domain:      domain,
		SLD:         extractSLD(domain),
		NameServers: []string{},
		Details:     make(map[string]string),
	}

	// Check cache first (unless refresh is true)
	if !refresh {
		if cached := getFromWhoisCache(domain); cached != nil {
			cached.Duration = time.Since(start).Milliseconds()
			return *cached
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Step 1: Find the correct WHOIS server for this domain's TLD
	server := getWhoisServer(domain)
	result.Server = server

	// Step 2: Query the TLD-specific WHOIS server
	response, err := queryWhois(ctx, server, domain)
	if err != nil {
		// Fallback: try IANA directly
		result.Server = "whois.iana.org"
		response, err = queryWhois(ctx, "whois.iana.org", domain)
		if err != nil {
			result.Error = fmt.Sprintf("WHOIS lookup failed: %v", err)
			result.Duration = time.Since(start).Milliseconds()
			return result
		}
	}

	// Step 3: Parse the response
	for _, line := range strings.Split(response, "\n") {
		lineTrimmed := strings.TrimSpace(line)
		if lineTrimmed == "" || strings.HasPrefix(lineTrimmed, "%") || strings.HasPrefix(lineTrimmed, "#") || strings.HasPrefix(lineTrimmed, "--") {
			continue
		}

		// Registrar (English + Turkish: kayitci, TurkNic)
		if v := parseWhoisField(lineTrimmed, "registrar:", "sponsoring organization:", "kayitci:", "turkish nic organisation:", "registrant:"); v != "" {
			if result.Registrar == "" {
				result.Registrar = v
			}
		}

		// Creation date — handle various formats + Turkish + TRABIS dot-padded
		if v := parseWhoisField(lineTrimmed, "creation date:", "created:", "created on:", "created on.", "registration time:", "registration date:", "kayit tarihi:", "domain creation date:", "registered:"); v != "" {
			if result.CreatedAt == "" {
				result.CreatedAt = v
			}
		}

		// Updated date + Turkish + TRABIS dot-padded
		if v := parseWhoisField(lineTrimmed, "updated date:", "last modified:", "last updated:", "last-modified:", "changed:", "degisiklik tarihi:", "modification date:", "son guncelleme:", "last update time:", "last update time."); v != "" {
			if result.UpdatedAt == "" {
				result.UpdatedAt = v
			}
		}

		// Expiry date — handle various formats + Turkish + TRABIS dot-padded
		if v := parseWhoisField(lineTrimmed, "registry expiry date:", "expiry date:", "expiration date:", "expires:", "expires on.", "paid-till:", "validity:", "bitis tarihi:", "son kullanma tarihi:", "domain expiry date:", "paid-until:"); v != "" {
			if result.ExpiresAt == "" {
				result.ExpiresAt = v
			}
		}

		// Name servers + Turkish: ad sunucu
		if v := parseWhoisField(lineTrimmed, "name server:", "nserver:", "nameserver:", "domain nameservers:", "ad sunucu:", "nameservers:", "name servers:"); v != "" {
			ns := strings.ToLower(v)
			// Remove trailing dot
			ns = strings.TrimSuffix(ns, ".")
			// Deduplicate
			duplicate := false
			for _, existing := range result.NameServers {
				if existing == ns {
					duplicate = true
					break
				}
			}
			if !duplicate {
				result.NameServers = append(result.NameServers, ns)
			}
		}

		// Turkish WHOIS format: standalone NS entries like "s1.dgntek.com" on their own lines
		// These appear after "Domain Servers:" header and are just domain names
		if !strings.Contains(lineTrimmed, ":") && strings.Contains(lineTrimmed, ".") && !strings.Contains(lineTrimmed, " ") {
			// Looks like a domain name - could be a name server
			// Only add if it looks like a valid NS name (has dots and not an obvious URL)
			if strings.Count(lineTrimmed, ".") >= 1 && len(lineTrimmed) > 4 {
				ns := strings.ToLower(strings.TrimSpace(lineTrimmed))
				ns = strings.TrimSuffix(ns, ".")
				// Filter out obvious non-NS entries
				if !strings.HasPrefix(ns, "http") && !strings.HasPrefix(ns, "www") {
					duplicate := false
					for _, existing := range result.NameServers {
						if existing == ns {
							duplicate = true
							break
						}
					}
					if !duplicate {
						result.NameServers = append(result.NameServers, ns)
					}
				}
			}
		}

		// Store raw details for debugging
		if idx := strings.Index(lineTrimmed, ":"); idx > 0 {
			key := strings.TrimSpace(lineTrimmed[:idx])
			val := strings.TrimSpace(lineTrimmed[idx+1:])
			if key != "" && val != "" {
				result.Details[key] = val
			}
		}
	}

	// Store raw response for debugging
	if result.Registrar == "" && result.CreatedAt == "" {
		if len(response) > 0 {
			result.Details["raw"] = response
		}
	}

	result.Duration = time.Since(start).Milliseconds()

	// Cache the result (skip caching if there was an error)
	if result.Error == "" {
		setWhoisCache(domain, result)
	}

	return result
}
