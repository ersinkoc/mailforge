package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
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

	// New gTLDs - Brand TLDs (note: com, net, org, name, mobi, jobs, io, email, cloud, etc. already defined above)
	"apple":     "whois.afilias.net",
	"amazon":    "whois.nic.amazon",
	"google":    "whois.nic.google",
	"microsoft": "whois.nic.microsoft",
	"intel":     "whois.intel.com",
	"dell":      "whois.dell.com",
	"cisco":     "whois.cisco.com",
	"oracle":    "whois.oracle.com",
	"adobe":     "whois.adobe.com",
	"ibm":       "whois.markmonitor.com",
	"samsung":   "whois.samsung.com",
	"sony":     "whois.sonynic.com",
	"toyota":   "whois.toyota.com",
	"bmw":      "whois.bmw.com",
	"mercedes": "whois.mercedes-benz.com",
	"audi":     "whois.audi.com",
	"fox":      "whois.fox.com",
	"disney":   "whois.disney.com",
	"hotels":   "whois.booking.com",
	"travel":   "whois.travel.com",
	"airbnb":   "whois.airbnb.com",
	"uber":     "whois.uber.com",
	"spotify":  "whois.nic.spotify",
	"netflix":  "whois.nic.netflix",
	"twitter":  "whois.nic.twitter",

	// New gTLDs - Generic
	"academy":   "whois.nic.academy",
	"agency":    "whois.nic.agency",
	"apartments": "whois.nic.apartments",
	"associates": "whois.nic.associates",
	"attorney":  "whois.nic.attorney",
	"auction":   "whois.nic.auction",
	"audio":     "whois.nic.audio",
	"auto":      "whois.nic.auto",
	"autos":     "whois.nic.autos",
	"baby":      "whois.nic.baby",
	"band":      "whois.nic.band",
	"bank":      "whois.nic.bank",
	"bar":       "whois.nic.bar",
	"beauty":    "whois.nic.beauty",
	"beer":      "whois.nic.beer",
	"best":      "whois.nic.best",
	"bible":     "whois.nic.bible",
	"bid":       "whois.nic.bid",
	"bike":      "whois.nic.bike",
	"bingo":     "whois.nic.bingo",
	"black":     "whois.nic.black",
	"blog":      "whois.nic.blog",
	"blue":      "whois.nic.blue",
	"book":      "whois.nic.book",
	"boutique":  "whois.nic.boutique",
	"broker":    "whois.nic.broker",
	"build":     "whois.nic.build",
	"business":  "whois.nic.business",
	"buy":       "whois.nic.buy",
	"buzz":      "whois.nic.buzz",
	"cafe":      "whois.nic.cafe",
	"camera":    "whois.nic.camera",
	"camp":      "whois.nic.camp",
	"capital":   "whois.nic.capital",
	"car":       "whois.nic.car",
	"cards":     "whois.nic.cards",
	"care":      "whois.nic.care",
	"career":    "whois.nic.career",
	"careers":   "whois.nic.careers",
	"cash":      "whois.nic.cash",
	"casino":    "whois.nic.casino",
	"center":    "whois.nic.center",
	"charity":   "whois.nic.charity",
	"chat":      "whois.nic.chat",
	"cheap":     "whois.nic.cheap",
	"christmas": "whois.nic.christmas",
	"church":    "whois.nic.church",
	"city":      "whois.nic.city",
	"claims":    "whois.nic.claims",
	"cleaning":  "whois.nic.cleaning",
	"click":     "whois.nic.click",
	"clinic":    "whois.nic.clinic",
	"clothing":  "whois.nic.clothing",
	"cloud":     "whois.nic.cloud",
	"club":      "whois.nic.club",
	"coach":     "whois.nic.coach",
	"codes":     "whois.nic.codes",
	"coffee":    "whois.nic.coffee",
	"college":   "whois.nic.college",
	"community": "whois.nic.community",
	"company":   "whois.nic.company",
	"compare":   "whois.nic.compare",
	"computer":  "whois.nic.computer",
	"condos":    "whois.nic.condos",
	"construction": "whois.nic.construction",
	"consulting": "whois.nic.consulting",
	"contact":   "whois.nic.contact",
	"contractors": "whois.nic.contractors",
	"cooking":   "whois.nic.cooking",
	"cool":      "whois.nic.cool",
	"corsica":   "whois.nic.corsica",
	"country":   "whois.nic.country",
	"coupons":   "whois.nic.coupons",
	"courses":   "whois.nic.courses",
	"coupon":    "whois.nic.coupon",
	"credit":    "whois.nic.credit",
	"creditcard": "whois.nic.creditcard",
	"cruises":   "whois.nic.cruises",
	"dance":     "whois.nic.dance",
	"dating":    "whois.nic.dating",
	"deals":     "whois.nic.deals",
	"degree":    "whois.nic.degree",
	"delivery":  "whois.nic.delivery",
	"democrat":  "whois.nic.democrat",
	"dental":    "whois.nic.dental",
	"dentist":   "whois.nic.dentist",
	"desi":      "whois.nic.desi",
	"design":    "whois.nic.design",
	"diamonds":  "whois.nic.diamonds",
	"diet":      "whois.nic.diet",
	"digital":   "whois.nic.digital",
	"direct":    "whois.nic.direct",
	"directory": "whois.nic.directory",
	"discount":  "whois.nic.discount",
	"doctor":    "whois.nic.doctor",
	"dog":       "whois.nic.dog",
	"domains":   "whois.nic.domains",
	"dot":       "whois.nic.dot",
	"download":  "whois.nic.download",
	"drinks":    "whois.nic.drinks",
	"drive":     "whois.nic.drive",
	"earth":     "whois.nic.earth",
	"education": "whois.nic.education",
	"energy":    "whois.nic.energy",
	"engineer":  "whois.nic.engineer",
	"engineering": "whois.nic.engineering",
	"enterprises": "whois.nic.enterprises",
	"equipment": "whois.nic.equipment",
	"estate":    "whois.nic.estate",
	"eus":       "whois.nic.eus",
	"events":    "whois.nic.events",
	"exchange":  "whois.nic.exchange",
	"expert":    "whois.nic.expert",
	"exposed":   "whois.nic.exposed",
	"express":   "whois.nic.express",
	"fail":      "whois.nic.fail",
	"faith":     "whois.nic.faith",
	"family":    "whois.nic.family",
	"fan":       "whois.nic.fan",
	"fans":      "whois.nic.fans",
	"farm":      "whois.nic.farm",
	"fashion":   "whois.nic.fashion",
	"feedback":  "whois.nic.feedback",
	"film":      "whois.nic.film",
	"finance":   "whois.nic.finance",
	"financial": "whois.nic.financial",
	"fire":      "whois.nic.fire",
	"fish":      "whois.nic.fish",
	"fishing":   "whois.nic.fishing",
	"fit":       "whois.nic.fit",
	"fitness":   "whois.nic.fitness",
	"flights":   "whois.nic.flights",
	"florist":   "whois.nic.florist",
	"flowers":   "whois.nic.flowers",
	"fly":       "whois.nic.fly",
	"foo":       "whois.nic.google",
	"food":      "whois.nic.food",
	"football":  "whois.nic.football",
	"forex":     "whois.nic.forex",
	"forsale":   "whois.nic.forsale",
	"forum":     "whois.nic.forum",
	"foundation": "whois.nic.foundation",
	"fun":       "whois.nic.fun",
	"fund":      "whois.nic.fun",
	"furniture": "whois.nic.furniture",
	"futbol":    "whois.nic.futbol",
	"fyi":       "whois.nic.fyi",
	"gallery":   "whois.nic.gallery",
	"game":      "whois.nic.game",
	"games":     "whois.nic.games",
	"garden":    "whois.nic.garden",
	"gay":       "whois.nic.gay",
	"gdn":       "whois.nic.gdn",
	"gent":      "whois.nic.gent",
	"gift":      "whois.nic.gift",
	"gifts":     "whois.nic.gifts",
	"gives":     "whois.nic.gives",
	"giving":    "whois.nic.giving",
	"glass":     "whois.nic.glass",
	"global":    "whois.nic.global",
	"gmbh":      "whois.nic.gmbh",
	"gold":      "whois.nic.gold",
	"golf":      "whois.nic.golf",
	"green":     "whois.nic.green",
	"gripe":     "whois.nic.gripe",
	"group":     "whois.nic.group",
	"guide":     "whois.nic.guide",
	"guitars":   "whois.nic.guitars",
	"guru":      "whois.nic.guru",
	"hair":      "whois.nic.hair",
	"hangout":   "whois.nic.google",
	"haus":      "whois.nic.haus",
	"health":    "whois.nic.health",
	"healthcare": "whois.nic.healthcare",
	"help":      "whois.nic.help",
	"here":      "whois.nic.google",
	"hermes":    "whois.nic.hermes",
	"hiphop":    "whois.nic.hiphop",
	"hiv":       "whois.nic.hiv",
	"hockey":    "whois.nic.hockey",
	"holdings":  "whois.nic.holdings",
	"holiday":   "whois.nic.holiday",
	"homes":     "whois.nic.homes",
	"horse":     "whois.nic.horse",
	"hospital":  "whois.nic.hospital",
	"host":      "whois.nic.host",
	"hosting":   "whois.nic.hosting",
	"house":     "whois.nic.house",
	"how":       "whois.nic.google",
	"ice":       "whois.nic.ice",
	"icu":       "whois.nic.icu",
	"ifmy":      "whois.nic.ifmy",
	"immo":      "whois.nic.immo",
	"immobilien": "whois.nic.immobilien",
	"inc":       "whois.nic.inc",
	"industries": "whois.nic.industries",
	"ink":       "whois.nic.ink",
	"institute": "whois.nic.institute",
	"insurance": "whois.nic.insurance",
	"insure":    "whois.nic.insure",
	"investments": "whois.nic.investments",
	"irish":     "whois.nic.irish",
	"jewelry":   "whois.nic.jewelry",
	"joburg":    "whois.nic.joburg",
	"kaufen":    "whois.nic.kaufen",
	"kim":       "whois.nic.kim",
	"kitchen":   "whois.nic.kitchen",
	"kiwi":      "whois.nic.kiwi",
	"land":      "whois.nic.land",
	"lat":       "whois.nic.lat",
	"latino":    "whois.nic.latino",
	"lawyer":    "whois.nic.lawyer",
	"lease":     "whois.nic.lease",
	"lgbt":      "whois.nic.lgbt",
	"life":      "whois.nic.life",
	"lighting":  "whois.nic.lighting",
	"like":      "whois.nic.like",
	"link":      "whois.nic.link",
	"live":      "whois.nic.live",
	"llc":       "whois.nic.llc",
	"loan":      "whois.nic.loan",
	"loans":     "whois.nic.loans",
	"locker":    "whois.nic.locker",
	"london":    "whois.nic.london",
	"love":      "whois.nic.love",
	"ltd":       "whois.nic.ltd",
	"ltda":      "whois.nic.ltda",
	"luxury":    "whois.nic.luxury",
	"madrid":    "whois.nic.madrid",
	"maif":      "whois.nic.maif",
	"maison":    "whois.nic.maison",
	"makeup":    "whois.nic.makeup",
	"management": "whois.nic.management",
	"map":       "whois.nic.map",
	"market":    "whois.nic.market",
	"marketing": "whois.nic.marketing",
	"markets":   "whois.nic.markets",
	"mba":       "whois.nic.mba",
	"media":     "whois.nic.media",
	"meet":      "whois.nic.meet",
	"melbourne": "whois.nic.melbourne",
	"memorial":  "whois.nic.memorial",
	"men":       "whois.nic.men",
	"menu":      "whois.nic.menu",
	"miami":     "whois.nic.miami",
	"mini":      "whois.nic.mini",
	"mls":       "whois.nic.mls",
	"mobile":    "whois.nic.mobile",
	"moto":      "whois.nic.moto",
	"motorcycles": "whois.nic.motorcycles",
	"mov":       "whois.nic.google",
	"movie":     "whois.nic.movie",
	"music":     "whois.nic.music",
	"navy":      "whois.nic.navy",
	"network":   "whois.nic.network",
	"new":       "whois.nic.google",
	"news":      "whois.nic.news",
	"next":      "whois.nic.next",
	"ngo":       "whois.nic.ngo",
	"ninja":     "whois.nic.ninja",
	"now":       "whois.nic.google",
	"nsw":       "whois.nic.nsw",
	"nyc":       "whois.nic.nyc",
	"observer":  "whois.nic.observer",
	"off":       "whois.nic.off",
	"one":       "whois.nic.one",
	"ong":       "whois.nic.ong",
	"onl":       "whois.nic.onl",
	"online":    "whois.nic.online",
	"ooo":       "whois.nic.ooo",
	"organic":   "whois.nic.organic",
	"origins":   "whois.nic.origins",
	"osaka":     "whois.nic.osaka",
	"page":      "whois.nic.google",
	"paris":     "whois.nic.paris",
	"partners":  "whois.nic.partners",
	"parts":     "whois.nic.parts",
	"party":     "whois.nic.party",
	"pet":       "whois.nic.pet",
	"pharmacy":  "whois.nic.pharmacy",
	"photo":     "whois.nic.photo",
	"photography": "whois.nic.photography",
	"photos":    "whois.nic.photos",
	"physio":    "whois.nic.physio",
	"pics":      "whois.nic.pics",
	"pictures":  "whois.nic.pictures",
	"pink":      "whois.nic.pink",
	"pizza":     "whois.nic.pizza",
	"place":     "whois.nic.place",
	"plumbing":  "whois.nic.plumbing",
	"plus":      "whois.nic.plus",
	"poker":     "whois.nic.poker",
	"politie":   "whois.nic.politie",
	"porn":      "whois.nic.porn",
	"post":      "whois.nic.post",
	"press":     "whois.nic.press",
	"productions": "whois.nic.productions",
	"prof":      "whois.nic.prof",
	"promo":     "whois.nic.promo",
	"properties": "whois.nic.properties",
	"property":  "whois.nic.property",
	"protection": "whois.nic.protection",
	"pub":       "whois.nic.pub",
	"qpon":      "whois.nic.qpon",
	"quebec":    "whois.nic.quebec",
	"racing":    "whois.nic.racing",
	"radio":     "whois.nic.radio",
	"read":      "whois.nic.read",
	"realestate": "whois.nic.realestate",
	"realtor":   "whois.nic.realtor",
	"realty":    "whois.nic.realty",
	"recipes":   "whois.nic.recipes",
	"red":       "whois.nic.red",
	"rehab":     "whois.nic.rehab",
	"reisen":    "whois.nic.reisen",
	"rent":      "whois.nic.rent",
	"rentals":   "whois.nic.rentals",
	"repair":    "whois.nic.repair",
	"report":    "whois.nic.report",
	"republican": "whois.nic.republican",
	"rest":      "whois.nic.rest",
	"restaurant": "whois.nic.restaurant",
	"review":    "whois.nic.review",
	"reviews":   "whois.nic.reviews",
	"rich":      "whois.nic.rich",
	"rio":       "whois.nic.rio",
	"rip":       "whois.nic.rip",
	"rocks":     "whois.nic.rocks",
	"rodeo":     "whois.nic.rodeo",
	"roma":      "whois.nic.roma",
	"room":      "whois.nic.room",
	"ruhr":      "whois.nic.ruhr",
	"run":       "whois.nic.run",
	"ryukyu":    "whois.nic.ryukyu",
	"sale":      "whois.nic.sale",
	"salon":     "whois.nic.salon",
	"sandvik":   "whois.nic.sandvik",
	"sandvikcoromant": "whois.nic.sandvikcoromant",
	"saarland":  "whois.nic.saarland",
	"scholarships": "whois.nic.scholarships",
	"school":    "whois.nic.school",
	"schule":    "whois.nic.schule",
	"science":   "whois.nic.science",
	"secure":    "whois.nic.secure",
	"security":  "whois.nic.security",
	"seek":      "whois.nic.seek",
	"services":  "whois.nic.services",
	"sex":       "whois.nic.sex",
	"sexy":      "whois.nic.sexy",
	"shiksha":   "whois.nic.shiksha",
	"shoes":     "whois.nic.shoes",
	"shop":      "whois.nic.shop",
	"shopping":  "whois.nic.shopping",
	"show":      "whois.nic.show",
	"shriram":   "whois.nic.shriram",
	"singles":   "whois.nic.singles",
	"site":      "whois.nic.site",
	"ski":       "whois.nic.ski",
	"skin":      "whois.nic.skin",
	"soccer":    "whois.nic.soccer",
	"social":    "whois.nic.social",
	"software":  "whois.nic.software",
	"solar":     "whois.nic.solar",
	"solutions": "whois.nic.solutions",
	"soy":       "whois.nic.soy",
	"space":     "whois.nic.space",
	"spa":       "whois.nic.spa",
	"spread":    "whois.nic.spread",
	"srl":       "whois.nic.srl",
	"storage":   "whois.nic.storage",
	"study":     "whois.nic.study",
	"style":     "whois.nic.style",
	"sucks":     "whois.nic.sucks",
	"supplies":  "whois.nic.supplies",
	"supply":    "whois.nic.supply",
	"support":   "whois.nic.support",
	"surf":      "whois.nic.surf",
	"surgery":   "whois.nic.surgery",
	"sydney":    "whois.nic.sydney",
	"systems":   "whois.nic.systems",
	"tab":       "whois.nic.google",
	"taipei":    "whois.nic.taipei",
	"tatar":     "whois.nic.tatar",
	"tattoo":    "whois.nic.tattoo",
	"tax":       "whois.nic.tax",
	"taxi":      "whois.nic.taxi",
	"team":      "whois.nic.team",
	"technology": "whois.nic.technology",
	"tennis":    "whois.nic.tennis",
	"theater":   "whois.nic.theater",
	"theatre":   "whois.nic.theatre",
	"tickets":   "whois.nic.tickets",
	"tienda":    "whois.nic.tienda",
	"tips":      "whois.nic.tips",
	"tires":     "whois.nic.tires",
	"today":     "whois.nic.today",
	"tokyo":     "whois.nic.tokyo",
	"tools":     "whois.nic.tools",
	"top":       "whois.nic.top",
	"tour":      "whois.nic.tour",
	"town":      "whois.nic.town",
	"toys":      "whois.nic.toys",
	"trade":     "whois.nic.trade",
	"trading":   "whois.nic.trading",
	"training":  "whois.nic.training",
	"travelers": "whois.nic.travelers",
	"trust":     "whois.nic.trust",
	"tube":      "whois.nic.tube",
	"tushu":     "whois.nic.tushu",
	"tv":        "whois.nic.tv",
	"university": "whois.nic.university",
	"uno":       "whois.nic.uno",
	"vacations": "whois.nic.vacations",
	"vana":      "whois.nic.vana",
	"vegas":     "whois.nic.vegas",
	"ventures":  "whois.nic.ventures",
	"versicherung": "whois.nic.versicherung",
	"vet":       "whois.nic.vet",
	"video":     "whois.nic.video",
	"villas":    "whois.nic.villas",
	"vision":    "whois.nic.vision",
	"vlaanderen": "whois.nic.vlaanderen",
	"vodka":     "whois.nic.vodka",
	"vote":      "whois.nic.vote",
	"voting":    "whois.nic.voting",
	"voyage":    "whois.nic.voyage",
	"wales":     "whois.nic.wales",
	"wang":      "whois.nic.wang",
	"watch":     "whois.nic.watch",
	"web":       "whois.nic.web",
	"webcam":    "whois.nic.webcam",
	"website":   "whois.nic.website",
	"wedding":   "whois.nic.wedding",
	"weibo":     "whois.nic.weibo",
	"whois":     "whois.nic.whois",
	"wiki":      "whois.nic.wiki",
	"win":       "whois.nic.win",
	"wine":      "whois.nic.wine",
	"wme":       "whois.nic.wme",
	"work":      "whois.nic.work",
	"works":     "whois.nic.works",
	"world":     "whois.nic.world",
	"wtf":       "whois.nic.wtf",
	"xbox":      "whois.nic.xbox",
	"yachts":    "whois.nic.yachts",
	"yoga":      "whois.nic.yoga",
	"youtube":   "whois.nic.youtube",
	"zuerich":   "whois.nic.zuerich",
	"zx":        "whois.nic.zx",

	// Africa TLDs
	"africa": "whois.nic.za",
	"gh":     "whois.nic.gh",
	"ghana":  "whois.nic.ghana",
	"ug":     "whois.nic.ug",
	"tz":     "whois.tznic.or.tz",
	"rw":     "whois.ricta.org.rw",
	"mz":     "whois.nic.mz",
	"zm":     "whois.zicta.zm",
	"bw":     "whois.nic.bw",

	// More Asia/Pacific TLDs
	"bd":   "whois.btcl.com.bd",
	"lk":   "whois.nic.lk",
	"np":   "whois.nic.np",
	"bt":   "whois.nic.bt",

	// More European TLDs
	"ua":       "whois.ua",
	"bel":      "whois.tld.by",

	// Middle East TLDs
	"lb":  "whois.lbdr.org.lb",
	"jo":  "whois.nic.jo",
	"om":  "whois.registry.om",
	"bh":  "whois.nic.bh",
	"eg":  "whois.registrar.eg",
	"dz":  "whois.nic.dz",
	"tn":  "whois.ati.tn",
	"ma":  "whois.registrar.ma",

	// Caribbean TLDs
	"bs":   "whois.nic.bs",
	"cw":   "whois.nic.cw",
	"jm":   "whois.nic.jm",
	"vi":   "whois.nic.vi",

	// Pacific Island TLDs
	"pf":    "whois.registry.pf",
	"ws":    "whois.nic.ws",
	"sb":    "whois.nic.sb",
	"to":    "whois.tonic.to",
	"vu":    "whois.nic.vu",
	"ki":    "whois.nic.ki",
	"nr":    "whois.nic.nr",
	"gu":    "whois.nic.gu",
	"mp":    "whois.nic.mp",
	"tl":    "whois.nic.tl",
}

// Known RDAP servers for TLDs that use RDAP instead of WHOIS.
// RDAP (Registration Data Access Protocol) is the modern replacement for WHOIS.
// Format: base URL (without trailing slash) for RDAP queries.
var knownRdapServers = map[string]string{
	// Google-operated TLDs (.dev, .app, .chrome, etc.)
	"dev":     "https://pubapi.registry.google/rdap",
	"app":     "https://pubapi.registry.google/rdap",
	"chrome":  "https://pubapi.registry.google/rdap",
	"android": "https://pubapi.registry.google/rdap",
	"ads":     "https://pubapi.registry.google/rdap",
	"play":    "https://pubapi.registry.google/rdap",
	"search":  "https://pubapi.registry.google/rdap",
	"how":     "https://pubapi.registry.google/rdap",
	"page":    "https://pubapi.registry.google/rdap",
	"php":     "https://pubapi.registry.google/rdap",
	"plus":    "https://pubapi.registry.google/rdap",
	"voyage":  "https://pubapi.registry.google/rdap",
	"moto":    "https://pubapi.registry.google/rdap",
	"here":    "https://pubapi.registry.google/rdap",
	"new":     "https://pubapi.registry.google/rdap",

	// Other notable RDAP-enabled TLDs
	"xyz":  "https://rdap.nic.xyz",
	"wiki": "https://rdap.nic.wiki",
	"ink":  "https://rdap.nic.ink",

	// NeuStar/Identity Digital TLDs
	"buzz": "https://rdap.registrar.buzz",
	"io":   "https://rdap.nic.io",
	"co":   "https://rdap.nic.co",
	"ai":   "https://rdap.nic.ai",
	"us":   "https://rdap.nic.us",

	// CentralNic TLDs
	"click":   "https://rdap.centralnic.com/click",
	"link":    "https://rdap.centralnic.com/link",
	"host":    "https://rdap.centralnic.com/host",
	"cloud":   "https://rdap.centralnic.com/cloud",
	"fun":     "https://rdap.centralnic.com/fun",
	"zone":    "https://rdap.centralnic.com/zone",
	"pub":     "https://rdap.centralnic.com/pub",
	"shop":    "https://rdap.centralnic.com/shop",
	"work":    "https://rdap.centralnic.com/work",
	"best":    "https://rdap.centralnic.com/best",
	"bet":     "https://rdap.centralnic.com/bet",

	// Verisign RDAP servers
	"com":    "https://rdap.verisign.com/com",
	"cc":     "https://rdap.verisign.com/cc",
	"net":    "https://rdap.verisign.com",

	// Public Interest Registry (PIR) RDAP
	"org":    "https://rdap.publicinterestregistry.org",

	// Radix RDAP servers
	"online":  "https://rdap.radix.website",
	"site":    "https://rdap.radix.website",
	"website": "https://rdap.radix.website",
	"space":  "https://rdap.radix.website",
	"press":  "https://rdap.radix.website",
	"global": "https://rdap.radix.website",

	// Af菪as RDAP servers
	"info":  "https://rdap.afilias.net",
	"mobi":  "https://rdap.afilias.net",
	"pink":  "https://rdap.afilias.net",
	"black": "https://rdap.afilias.net",
	"blue":  "https://rdap.afilias.net",
	"kim":   "https://rdap.afilias.net",
	"lgbt":  "https://rdap.afilias.net",
	"pet":   "https://rdap.afilias.net",

	// Other RDAP-enabled registries
	"cat":  "https://rdap.nic.cat",
	"eu":   "https://rdap.eu",
	"nl":   "https://rdap.sidn.nl",
	"br":   "https://rdap.registro.br",
	"se":   "https://rdap.iis.se",
	"fi":   "https://rdap.netowl.fi",
	"no":   "https://rdap.norid.no",
	"dk":   "https://rdap.dk-hostmaster.dk",
	"at":   "https://rdap.nic.at",
	"be":   "https://rdap.dns.be",
	"it":   "https://rdap.nic.it",
	"es":   "https://rdap.nic.es",
	"fr":   "https://rdap.nic.fr",
	"cz":   "https://rdap.nic.cz",
	"sk":   "https://rdap.sk-nic.sk",
	"hu":   "https://rdap.nic.hu",

	// Nominet (UK) RDAP
	"uk":  "https://rdap.nominet.uk",

	// JPRS (Japan) RDAP
	"jp":  "https://rdap.jprs.jp",

	// KR (Korea) RDAP
	"kr":  "https://rdap.kr",

	// CNNIC (China) RDAP
	"cn":  "https://rdap.cnnic.cn",

	//dot Asia
	"asia": "https://rdap.myava.net",
}

// getRdapServer returns the RDAP server URL for a TLD if known
func getRdapServer(tld string) string {
	if server, ok := knownRdapServers[tld]; ok {
		return server
	}
	return ""
}

// queryRdap queries an RDAP server using HTTP and returns the JSON response
func queryRdap(ctx context.Context, baseURL, domain string) (map[string]interface{}, error) {
	// Build RDAP URL: baseURL/domain
	url := baseURL + "/" + domain

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create RDAP request: %w", err)
	}

	req.Header.Set("Accept", "application/rdap+json")
	req.Header.Set("User-Agent", "MailForge/1.0 WHOIS-RDAP Client")

	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout: 10 * time.Second,
			}).DialContext,
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("RDAP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("domain not found")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("RDAP server returned status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse RDAP response: %w", err)
	}

	return result, nil
}

// parseRdapResponse converts an RDAP JSON response to WhoisResult format
func parseRdapResponse(domain string, rdap map[string]interface{}) WhoisResult {
	result := WhoisResult{
		Domain:      domain,
		SLD:         extractSLD(domain),
		NameServers: []string{},
		Details:     make(map[string]string),
	}

	// Parse RDAP JSON structure and convert to WHOIS-style fields

	// Handle RDAP "nameservers" array
	if ns, ok := rdap["nameservers"].([]interface{}); ok {
		for _, nsEntry := range ns {
			if nsObj, ok := nsEntry.(map[string]interface{}); ok {
				if ldhName, ok := nsObj["ldhName"].(string); ok {
					nsName := strings.ToLower(strings.TrimSuffix(ldhName, "."))
					result.NameServers = append(result.NameServers, nsName)
				}
			}
		}
	}

	// Handle RDAP events - contains creation, expiry, update dates
	if events, ok := rdap["events"].([]interface{}); ok {
		for _, event := range events {
			if eventObj, ok := event.(map[string]interface{}); ok {
				eventAction, _ := eventObj["eventAction"].(string)
				eventDate, _ := eventObj["eventDate"].(string)

				switch eventAction {
				case "registration":
					if result.CreatedAt == "" {
						result.CreatedAt = eventDate
					}
				case "expiration":
					if result.ExpiresAt == "" {
						result.ExpiresAt = eventDate
					}
				case "last changed":
					if result.UpdatedAt == "" {
						result.UpdatedAt = eventDate
					}
				}
			}
		}
	}

	// Handle registrar/ponsor organization
	if rdapEnt, ok := rdap["entities"].([]interface{}); ok {
		for _, ent := range rdapEnt {
			if entObj, ok := ent.(map[string]interface{}); ok {
				roles, _ := entObj["roles"].([]interface{})
				for _, role := range roles {
					if roleStr, ok := role.(string); ok && roleStr == "registrar" {
						if vcard, ok := entObj["vcardArray"].([]interface{}); ok {
							for _, vcardEntry := range vcard {
								if arr, ok := vcardEntry.([]interface{}); ok && len(arr) >= 4 {
									if fn, ok := arr[3].(string); ok {
										result.Registrar = fn
										break
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// Handle status
	if status, ok := rdap["status"].([]interface{}); ok {
		statuses := make([]string, 0, len(status))
		for _, s := range status {
			if str, ok := s.(string); ok {
				statuses = append(statuses, str)
			}
		}
		result.Details["Domain Status"] = strings.Join(statuses, ", ")
	}

	// Store RDAP data in raw for debugging
	rdapJSON, _ := json.MarshalIndent(rdap, "", "  ")
	result.Details["rdap"] = string(rdapJSON)

	return result
}

// tldInfo holds WHOIS and RDAP server information for a TLD
type tldInfo struct {
	whoisServer string
	rdapURL     string
}

// discoverTLDInfo queries IANA to discover the WHOIS and RDAP servers for any TLD.
// It fetches the IANA WHOIS response and optionally the HTML page to find RDAP info.
func discoverTLDInfo(ctx context.Context, tld string) tldInfo {
	info := tldInfo{}

	// First, try WHOIS query to IANA
	response, err := queryWhois(ctx, "whois.iana.org", tld)
	if err == nil {
		// Parse WHOIS server from "whois:" or "refer:" field
		for _, line := range strings.Split(response, "\n") {
			lineLower := strings.ToLower(strings.TrimSpace(line))

			if strings.HasPrefix(lineLower, "whois:") {
				server := strings.TrimPrefix(line, "whois:")
				server = strings.TrimPrefix(server, "Whois:")
				server = strings.TrimPrefix(server, "WHOIS:")
				server = strings.TrimSpace(server)
				if server != "" && server != "whois.iana.org" {
					info.whoisServer = server
					break
				}
			}

			if strings.HasPrefix(lineLower, "refer:") {
				server := strings.TrimPrefix(line, "refer:")
				server = strings.TrimPrefix(server, "Refer:")
				server = strings.TrimSpace(server)
				if server != "" && server != "whois.iana.org" {
					info.whoisServer = server
					break
				}
			}
		}

		// Try to extract RDAP URL from remarks line
		// Example: "remarks:      Registration information: https://www.registry.google"
		if info.rdapURL == "" {
			for _, line := range strings.Split(response, "\n") {
				lineLower := strings.ToLower(line)
				if strings.Contains(lineLower, "registration information:") ||
					strings.Contains(lineLower, "rdap server:") {
					// Extract URL from the line
					parts := strings.Split(line, "http")
					for i := 1; i < len(parts); i++ {
						url := "http" + strings.TrimSpace(parts[i])
						url = strings.TrimSuffix(url, ".")
						url = strings.TrimSpace(url)
						if strings.HasPrefix(url, "http") {
							info.rdapURL = url
							break
						}
					}
					if info.rdapURL != "" {
						break
					}
				}
			}
		}
	}

	// If RDAP URL not found from WHOIS response, try IANA HTML page
	if info.rdapURL == "" {
		if htmlURL := fetchIANAHTMLPage(ctx, tld); htmlURL != "" {
			info.rdapURL = htmlURL
		}
	}

	return info
}

// fetchIANAHTMLPage fetches the IANA HTML page for a TLD and extracts the RDAP server URL.
func fetchIANAHTMLPage(ctx context.Context, tld string) string {
	url := fmt.Sprintf("https://www.iana.org/domains/root/db/%s.html", strings.ToLower(tld))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "MailForge/1.0 WHOIS-RDAP Client")

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout: 5 * time.Second,
			}).DialContext,
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	html := string(bodyBytes)

	// Extract RDAP server from HTML
	// Pattern: <b>RDAP Server: </b> https://pubapi.registry.google/rdap/
	rdapPattern := regexp.MustCompile(`(?i)<b>\s*RDAP\s*Server:\s*</b>\s*(https?://[^\s<>]+)`)
	if matches := rdapPattern.FindStringSubmatch(html); len(matches) > 1 {
		rdapURL := strings.TrimSpace(matches[1])
		// Remove trailing slash if present
		rdapURL = strings.TrimSuffix(rdapURL, "/")
		return rdapURL
	}

	// Try to extract from "remarks" or "registration services" URL
	// and convert to RDAP URL if possible
	remarksPattern := regexp.MustCompile(`(?i)(?:registration\s*services?:|remarks:).*?(https?://[^\s<>]+)`)
	if matches := remarksPattern.FindStringSubmatch(html); len(matches) > 1 {
		regURL := strings.TrimSpace(matches[1])
		// Try to convert registry URL to RDAP URL
		rdapURL := convertToRdapURL(regURL)
		if rdapURL != "" {
			return rdapURL
		}
	}

	return ""
}

// convertToRdapURL attempts to convert a registry URL to an RDAP URL.
func convertToRdapURL(regURL string) string {
	// Common registry to RDAP URL conversions
	registryToRdap := map[string]string{
		"https://www.registry.google":            "https://pubapi.registry.google/rdap",
		"https://www.registry.google/":           "https://pubapi.registry.google/rdap",
		"https://www.verisign.com":               "https://rdap.verisign.com",
		"https://www.verisign.com/":              "https://rdap.verisign.com",
		"https://www.afilias.info":               "https://rdap.afilias.net",
		"https://www.afilias.net":                "https://rdap.afilias.net",
		"https://www.nic.io":                     "https://rdap.nic.io",
		"https://www.nic.co":                     "https://rdap.nic.co",
		"https://www.nic.ai":                     "https://rdap.nic.ai",
		"https://www.nic.xyz":                    "https://rdap.nic.xyz",
		"https://www.registry.xyz":               "https://rdap.nic.xyz",
		"https://www.centralnic.com":             "https://rdap.centralnic.com",
		"https://www.publicinterestregistry.org": "https://rdap.publicinterestregistry.org",
	}

	// Check for direct match
	if rdapURL, ok := registryToRdap[regURL]; ok {
		return rdapURL
	}

	// Try with trailing slash variations
	urls := []string{regURL, strings.TrimSuffix(regURL, "/"), regURL + "/"}
	for _, u := range urls {
		if rdapURL, ok := registryToRdap[u]; ok {
			return rdapURL
		}
	}

	// If URL contains certain patterns, try to construct RDAP URL
	lower := strings.ToLower(regURL)
	switch {
	case strings.Contains(lower, "registry.google"):
		return "https://pubapi.registry.google/rdap"
	case strings.Contains(lower, "verisign"):
		return "https://rdap.verisign.com"
	case strings.Contains(lower, "afilias"):
		return "https://rdap.afilias.net"
	case strings.Contains(lower, "nic.io"):
		return "https://rdap.nic.io"
	case strings.Contains(lower, "nic.co"):
		return "https://rdap.nic.co"
	case strings.Contains(lower, "nic.ai"):
		return "https://rdap.nic.ai"
	case strings.Contains(lower, "nic.xyz") || strings.Contains(lower, "registry.xyz"):
		return "https://rdap.nic.xyz"
	case strings.Contains(lower, "centralnic"):
		return "https://rdap.centralnic.com"
	case strings.Contains(lower, "publicinterestregistry") || strings.Contains(lower, "pir.org"):
		return "https://rdap.publicinterestregistry.org"
	}

	return ""
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
	// IMPORTANT: We query with the TLD only, NOT the full domain
	// whois.iana.org returns TLD records when queried with a TLD,
	// which contain a "whois:" line pointing to the actual WHOIS server
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	response, err := queryWhois(ctx, "whois.iana.org", tld)
	if err != nil {
		// Ultimate fallback
		return "whois.iana.org"
	}

	// IANA returns responses in two formats:
	// 1. New format: "whois:        whois.example.com"
	// 2. Old format: "refer:       whois.example.com"
	for _, line := range strings.Split(response, "\n") {
		lineLower := strings.ToLower(line)
		line = strings.TrimSpace(line)

		// Try "whois:" format first (most common now)
		if strings.HasPrefix(lineLower, "whois:") {
			server := strings.TrimPrefix(line, "whois:")
			server = strings.TrimPrefix(server, "Whois:")
			server = strings.TrimPrefix(server, "WHOIS:")
			server = strings.TrimSpace(server)
			if server != "" && server != "whois.iana.org" {
				return server
			}
		}

		// Also try "refer:" format (older IANA format)
		if strings.HasPrefix(lineLower, "refer:") {
			server := strings.TrimPrefix(line, "refer:")
			server = strings.TrimPrefix(server, "Refer:")
			server = strings.TrimSpace(server)
			if server != "" && server != "whois.iana.org" {
				return server
			}
		}
	}

	// If no valid referral found, return IANA
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

// isIanaTLDRecord detects if a WHOIS response is a TLD record instead of a domain record.
// This happens when whois.iana.org is queried with a domain instead of a TLD,
// or when a WHOIS server returns its TLD record instead of the domain record.
func isIanaTLDRecord(response, domain string) bool {
	domainLower := strings.ToLower(domain)
	tld := extractTLD(domain)
	tldLower := strings.ToLower(tld)

	// Check if the domain name appears in the response
	// Domain records should contain the domain name multiple times
	domainAppears := strings.Contains(strings.ToLower(response), domainLower)

	// TLD records typically contain references to the TLD but not the full domain
	// or contain "TLD" in the response
	tldAppears := strings.Contains(strings.ToLower(response), "."+tldLower)

	// Count how many times the domain appears in the response
	domainCount := strings.Count(strings.ToLower(response), domainLower)

	// If domain doesn't appear at all but TLD does, likely a TLD record
	if !domainAppears && tldAppears {
		return true
	}

	// If domain appears very few times (< 2), might be a TLD record
	// Real domain records have the domain appear multiple times (in various fields)
	if domainAppears && domainCount < 2 {
		return true
	}

	// Check for common TLD record indicators
	responseLower := strings.ToLower(response)
	tldIndicators := []string{
		"tld:", "tld record", "registry:", "tld parent",
		"domain not found:", "no match for:",
	}
	for _, indicator := range tldIndicators {
		if strings.Contains(responseLower, indicator) && !domainAppears {
			return true
		}
	}

	return false
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

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	// Step 1: Discover WHOIS and RDAP servers for this TLD dynamically
	tld := strings.ToLower(extractTLD(domain))
	tldInfo := discoverTLDInfo(ctx, tld)

	// Use known maps as fallback, but prefer discovered info
	whoisServer := tldInfo.whoisServer
	if whoisServer == "" {
		whoisServer = getWhoisServer(domain)
	}
	if whoisServer == "" {
		whoisServer = "whois.iana.org"
	}

	rdapServer := tldInfo.rdapURL
	if rdapServer == "" {
		rdapServer = getRdapServer(tld)
	}

	result.Server = whoisServer

	// Step 2: Query the WHOIS server
	response, err := queryWhois(ctx, whoisServer, domain)
	whoisSucceeded := err == nil && !isIanaTLDRecord(response, domain)

	// Step 3: If WHOIS failed or returned TLD record, try RDAP if available
	if !whoisSucceeded && rdapServer != "" {
		// WHOIS failed, try RDAP
		result.Server = rdapServer + " (RDAP)"

		if rdapData, rdapErr := queryRdap(ctx, rdapServer, domain); rdapErr == nil {
			// RDAP succeeded, parse it
			rdapResult := parseRdapResponse(domain, rdapData)
			rdapResult.Duration = time.Since(start).Milliseconds()
			rdapResult.Server = result.Server
			if rdapResult.Error == "" {
				setWhoisCache(domain, rdapResult)
				return rdapResult
			}
		}
	}

	// If we get here, either WHOIS succeeded or RDAP failed
	if err != nil {
		result.Error = fmt.Sprintf("WHOIS lookup failed for %s (server: %s): %v", domain, whoisServer, err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// Step 4: Detect if we got a TLD record instead of a domain record
	if isIanaTLDRecord(response, domain) {
		result.Error = fmt.Sprintf("WHOIS server %s did not return domain %s (got TLD record instead)", whoisServer, domain)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// Step 5: Parse the WHOIS response
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
