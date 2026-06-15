package tools

import (
	"strings"
)

// compoundTLDs is the exhaustive list of all known compound (multi-label) TLDs.
// A compound TLD is one where the public suffix spans two labels, e.g. .co.uk, .com.tr.
// This list is derived from knownWhoisServers keys that contain a dot.
// Keep sorted longest-first so HasSuffix matching is deterministic.
var compoundTLDs = []string{
	// ── Turkish second-level domains ──────────────────────────────
	"gov.nc.tr",
	"k12.tr",
	"gov.tr",
	"com.tr",
	"org.tr",
	"net.tr",
	"web.tr",
	"gen.tr",
	"edu.tr",
	"mil.tr",
	"bir.tr",
	"cop.tr",
	"dr.tr",
	"pol.tr",
	"bel.tr",
	"tsk.tr",
	"info.tr",
	"nc.tr",

	// ── UK second-level domains ──────────────────────────────────
	"co.uk",
	"org.uk",
	"net.uk",
	"me.uk",
	"ltd.uk",
	"plc.uk",

	// ── Japanese second-level domains ────────────────────────────
	"co.jp",
	"or.jp",
	"ne.jp",
	"go.jp",
	"ad.jp",
	"ac.jp",
	"gr.jp",
	"lg.jp",
	"geo.jp",
	"kids.jp",

	// ── Korean second-level domains ──────────────────────────────
	"co.kr",
	"or.kr",
	"ne.kr",
	"re.kr",
	"pe.kr",
	"go.kr",
	"mil.kr",
	"ac.kr",
	"hs.kr",
	"ms.kr",
	"es.kr",
	"seoul.kr",
	"busan.kr",
	"daegu.kr",
	"incheon.kr",
	"gwangju.kr",
	"daejeon.kr",
	"ulsan.kr",
	"gyeonggi.kr",

	// ── Australian second-level domains ──────────────────────────
	"com.au",
	"net.au",
	"org.au",
	"edu.au",
	"gov.au",
	"csiro.au",
	"id.au",

	// ── New Zealand second-level domains ─────────────────────────
	"co.nz",
	"net.nz",
	"org.nz",
	"maori.nz",

	// ── Brazilian second-level domains ───────────────────────────
	"com.br",
	"net.br",
	"org.br",
	"edu.br",
	"gov.br",
	"mil.br",
	"adv.br",
	"agr.br",
	"am.br",
	"art.br",
	"atm.br",
	"bio.br",
	"blog.br",
	"bmd.br",
	"cim.br",
	"cng.br",
	"cnt.br",
	"coop.br",
	"ecn.br",
	"eng.br",
	"esp.br",
	"etc.br",
	"eti.br",
	"far.br",
	"flog.br",
	"fm.br",
	"fnd.br",
	"fot.br",
	"fst.br",
	"g12.br",
	"geo.br",
	"ggr.br",
	"gro.br",
	"guj.br",
	"hosp.br",
	"imb.br",
	"ind.br",
	"inf.br",
	"jor.br",
	"jus.br",
	"leg.br",
	"lel.br",
	"mat.br",
	"med.br",
	"mus.br",
	"nom.br",
	"ntr.br",
	"odo.br",
	"ong.br",
	"ppg.br",
	"pro.br",
	"psc.br",
	"psi.br",
	"qsl.br",
	"rec.br",
	"slg.br",
	"tmp.br",
	"tur.br",
	"tv.br",
	"vet.br",
	"vix.br",
	"wleg.br",
	"xml.br",

	// ── Chinese second-level domains ──────────────────────────────
	"com.cn",
	"net.cn",
	"org.cn",
	"gov.cn",
	"ac.cn",
	"edu.cn",
	"mil.cn",
	"id.cn",

	// ── Colombian second-level domains ────────────────────────────
	"com.co",
	"net.co",
	"nom.co",
	"org.co",

	// ── Mexican second-level domains ─────────────────────────────
	"com.mx",
	"net.mx",
	"org.mx",

	// ── South African second-level domains ───────────────────────
	"co.za",
	"net.za",
	"org.za",
	"web.za",

	// ── Indian second-level domains ─────────────────────────────
	"co.in",
	"net.in",
	"org.in",
	"gen.in",
	"ind.in",
	"firm.in",
	"ac.in",
	"edu.in",
	"res.in",

	// ── Singapore second-level domains ─────────────────────────
	"com.sg",
	"net.sg",
	"org.sg",
	"edu.sg",
	"gov.sg",

	// ── Hong Kong second-level domains ─────────────────────────
	"com.hk",
	"net.hk",
	"org.hk",
	"edu.hk",
	"gov.hk",
	"idv.hk",

	// ── Taiwan second-level domains ────────────────────────────
	"com.tw",
	"net.tw",
	"org.tw",
	"idv.tw",
	"gov.tw",
	"edu.tw",
	"mil.tw",

	// ── Argentine second-level domains ──────────────────────────
	"com.ar",
	"net.ar",
	"org.ar",
	"gob.ar",
	"gov.ar",
	"int.ar",
	"mil.ar",
	"edu.ar",

	// ── Chilean second-level domains ────────────────────────────
	"com.cl",
	"net.cl",
	"org.cl",
	"gob.cl",
	"gov.cl",
	"mil.cl",

	// ── Venezuelan second-level domains ────────────────────────
	"com.ve",
	"net.ve",
	"org.ve",
	"co.ve",
	"info.ve",
	"web.ve",
	"gob.ve",
	"gov.ve",
	"edu.ve",

	// ── Peruvian second-level domains ──────────────────────────
	"com.pe",
	"net.pe",
	"org.pe",
	"gob.pe",
	"edu.pe",

	// ── Thai second-level domains ──────────────────────────────
	"co.th",
	"ac.th",
	"go.th",
	"in.th",
	"mi.th",
	"net.th",
	"or.th",

	// ── Indonesian second-level domains ───────────────────────
	"co.id",
	"net.id",
	"org.id",
	"ac.id",
	"go.id",
	"sch.id",
	"web.id",
	"mil.id",
	"biz.id",
}

// extractTLD returns the public suffix (TLD) from a domain.
// For Turkish second-level domains (.com.tr, .net.tr, etc.), it returns "tr"
// since those are SLDs under .tr, not separate TLDs.
// For other compound TLDs like .co.uk, .co.jp, it returns the full compound suffix.
// The second-level domain (e.g., "net.tr" for dgn.net.tr) is returned by extractSLD.
func extractTLD(domain string) string {
	domain = strings.ToLower(strings.TrimSpace(domain))
	domain = strings.TrimSuffix(domain, ".")

	// Turkish second-level domains: .tr is the actual TLD
	// These are SLDs, not separate TLDs
	turkishSLDs := []string{
		"gov.nc.tr", "k12.tr", "gov.tr", "com.tr", "org.tr", "net.tr",
		"web.tr", "gen.tr", "edu.tr", "mil.tr", "bir.tr", "cop.tr",
		"dr.tr", "pol.tr", "bel.tr", "tsk.tr", "info.tr", "nc.tr",
	}
	for _, sld := range turkishSLDs {
		if strings.HasSuffix(domain, "."+sld) {
			return "tr"
		}
	}

	// Check other compound TLDs first (longest match wins)
	for _, ctld := range compoundTLDs {
		if strings.HasSuffix(domain, "."+ctld) {
			return ctld
		}
	}

	// Simple TLD: everything after the last dot
	parts := strings.Split(domain, ".")
	if len(parts) >= 2 {
		return parts[len(parts)-1]
	}

	return domain
}

// extractSLD returns the second-level domain for Turkish .tr domains.
// For .tr domains like dgn.net.tr, it returns "net.tr".
// For all other TLDs (including other compound TLDs like .co.uk), it returns "".
func extractSLD(domain string) string {
	domain = strings.ToLower(strings.TrimSpace(domain))
	domain = strings.TrimSuffix(domain, ".")

	// Turkish second-level domains only
	turkishSLDs := []string{
		"gov.nc.tr", "k12.tr", "gov.tr", "com.tr", "org.tr", "net.tr",
		"web.tr", "gen.tr", "edu.tr", "mil.tr", "bir.tr", "cop.tr",
		"dr.tr", "pol.tr", "bel.tr", "tsk.tr", "info.tr", "nc.tr",
	}
	for _, sld := range turkishSLDs {
		if strings.HasSuffix(domain, "."+sld) {
			return sld
		}
	}

	return ""
}
