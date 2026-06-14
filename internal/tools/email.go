package tools

import (
	"context"
	"fmt"
	"net"
	"net/mail"
	"regexp"
	"strings"
	"time"
)

var (
	disposableDomains = map[string]bool{
		"mailinator.com": true, "guerrillamail.com": true, "tempmail.com": true,
		"10minutemail.com": true, "yopmail.com": true, "trashmail.com": true,
		"throwawaymail.com": true, "fakeinbox.com": true, "maildrop.cc": true,
		"getnada.com": true, "sharklasers.com": true, "guerrillamailblock.com": true,
		"pokemail.net": true, "spam4.me": true, "dispostable.com": true,
		"mintemail.com": true, "spamgourmet.com": true, "tempinbox.com": true,
		"mohmal.com": true, "tempemail.com": true, "tempmailer.com": true,
		"jetable.org": true, "mailcatch.com": true, "getairmail.com": true,
		"tempr.email": true, "discard.email": true, "burnermail.io": true,
		"emailondeck.com": true, "temp-mail.org": true, "inboxbear.com": true,
		"mvrht.com": true, "mt2015.com": true, "thankyou2010.com": true,
		"mt2009.com": true, "mailnesia.com": true, "mailnator.com": true,
		"meltmail.com": true, "no-spam.ws": true, "objectmail.com": true,
		"one-time.email": true, "pookmail.com": true, "rcpt.at": true,
		"rmqkr.net": true, "rppkn.com": true, "rtrtr.com": true,
		"sandelf.de": true, "saynotospams.com": true, "schafmail.de": true,
		"schrott-email.de": true, "secretemail.de": true, "sendspamhere.com": true,
		"sharedmailbox.org": true, "shieldedmail.com": true, "shieldemail.com": true,
		"shitmail.me": true, "shitware.nl": true, "shmeriously.com": true,
		"shortmail.net": true, "shotmail.ru": true, "sify.com": true,
		"sinnlos-mail.de": true, "skeefmail.com": true, "slapsfromlastnight.com": true,
		"slaskpost.se": true, "smashmail.de": true, "smellfear.com": true,
		"snakemail.com": true, "sneakemail.de": true, "snkmail.com": true,
		"sofimail.com": true, "sofort-mail.de": true, "solvemail.info": true,
		"sogetthis.com": true, "soodonims.com": true, "spam.la": true,
		"spam.su": true, "spamavert.com": true, "spambob.com": true,
		"spambob.net": true, "spambog.com": true, "spambog.de": true,
		"spambog.ru": true, "spambooger.com": true, "spambox.info": true,
		"spambox.irishspringrealty.com": true, "spamcero.com": true,
		"spamcon.org": true, "spamcorptastic.com": true, "spamcowboy.com": true,
		"spamcowboy.net": true, "spamcowboy.org": true, "spamday.com": true,
		"spamfree.eu": true, "spamfree24.com": true, "spamfree24.de": true,
		"spamfree24.eu": true, "spamfree24.info": true, "spamfree24.net": true,
		"spamfree24.org": true, "spamgoes.in": true, "spamherelots.com": true,
		"spamhereplease.com": true, "spamhit.com": true, "spamhole.com": true,
		"spamify.com": true, "spaminator.de": true, "spamkill.info": true,
		"spaml.com": true, "spaml.de": true, "spammotel.com": true,
		"spamobox.com": true, "spamoff.de": true, "spamslicer.com": true,
		"spamspot.com": true, "spamthis.co.uk": true, "spamtroll.net": true,
		"speed.1s.fr": true, "superrito.com": true, "suremail.info": true,
		"teewars.org": true, "teleworm.com": true, "teleworm.us": true,
		"thanksnospam.info": true, "thankyou.nospam": true, "thc.st": true,
		"thealohafly.com": true, "thejunkmail.com": true, "thisisnotmyrealemail.com": true,
		"throwam.com": true, "tilien.com": true, "tittbit.in": true,
		"tizi.com": true, "topranklist.de": true, "trash2009.com": true,
		"trashcanmail.com": true, "trashdevil.com": true, "trashemail.de": true,
		"trashinbox.com": true, "trashmail.at": true, "trashmail.io": true,
		"trashmail.me": true, "trashmail.net": true, "trashmail.org": true,
		"trashmail.ws": true, "trashmailer.com": true, "trashymail.com": true,
		"trashymail.net": true, "trbvm.com": true, "trialmail.de": true,
		"trillianpro.com": true, "twinmail.de": true, "tyldd.com": true,
		"uggsrock.com": true, "umail.net": true, "upliftnow.com": true,
		"uplipht.com": true, "venompen.com": true, "veryrealemail.com": true,
		"vidchart.com": true, "viralplays.com": true, "vmpanda.com": true,
		"vomoto.com": true, "vpn.st": true, "vsimcard.com": true,
		"vubby.com": true, "wasteland.rfc822.org": true, "webm4il.info": true,
		"webuser.in": true, "wee.my": true, "weg-werf-email.de": true,
		"wegwerf-email-addressen.de": true, "wegwerf-email.de": true,
		"wegwerf-email.net": true, "wegwerf-emails.de": true, "wegwerfadresse.de": true,
		"wegwerfemail.com": true, "wegwerfemail.de": true, "wegwerfemail.info": true,
		"wegwerfemail.net": true, "wegwerfemail.org": true, "wegwerfemailadresse.com": true,
		"wegwerfmail.adresse.de": true, "wegwerfmail.de": true, "wegwerfmail.info": true,
		"wegwerfmail.net": true, "wegwerfmail.org": true, "wegwerfmailadresse.de": true,
		"wegwerpmailadresse.de": true, "wegwerpmail.net": true, "wegwerpmail.org": true,
		"wetrainbayarea.com": true, "wh4f.org": true, "whyspam.me": true,
		"wilemail.com": true, "wmail.club": true, "writeme.us": true,
		"wuzup.net": true, "wuzupmail.net": true, "www.e4ward.com": true,
		"www.gishpuppy.com": true, "www.mailinator.com": true, "wwwnew.eu": true,
		"xagloo.com": true, "xemaps.com": true, "xents.com": true,
		"xmaily.com": true, "xoxy.net": true, "yapped.net": true,
		"yeah.net": true, "yep.it": true, "yogamaven.com": true,
		"yopolis.com": true, "ypmail.webarnak.fr.eu.org": true, "yui.it": true,
		"yuurok.com": true, "zehnminutenmail.de": true, "zoemail.com": true,
		"zomg.info": true, "zzz.com": true,
	}

	roleBasedPrefixes = map[string]bool{
		"admin": true, "administrator": true, "webmaster": true, "hostmaster": true,
		"postmaster": true, "info": true, "support": true, "abuse": true,
		"noc": true, "security": true, "sales": true, "marketing": true,
		"contact": true, "help": true, "billing": true, "legal": true,
		"press": true, "media": true, "careers": true, "jobs": true,
		"hr": true, "office": true, "enquiries": true, "team": true,
		"staff": true, "ceo": true, "cto": true, "cfo": true,
		"compliance": true, "privacy": true, "dpo": true, "sysadmin": true,
		"dev": true, "developer": true, "engineering": true, "ops": true,
	}

	freeProviders = map[string]bool{
		"gmail.com": true, "yahoo.com": true, "yahoo.co.uk": true, "hotmail.com": true,
		"outlook.com": true, "live.com": true, "aol.com": true, "icloud.com": true,
		"me.com": true, "mac.com": true, "protonmail.com": true, "proton.me": true,
		"tutanota.com": true, "tuta.io": true, "gmx.com": true, "gmx.de": true,
		"yandex.com": true, "yandex.ru": true, "mail.com": true, "mail.ru": true,
		"zoho.com": true, "fastmail.com": true, "qq.com": true, "163.com": true,
		"126.com": true, "sina.com": true, "naver.com": true, "daum.net": true,
		"rediffmail.com": true, "rocketmail.com": true, "yahoo.fr": true,
		"yahoo.in": true, "yahoo.it": true, "yahoo.es": true, "yahoo.de": true,
		"comcast.net": true, "verizon.net": true, "att.net": true, "sbcglobal.net": true,
		"cox.net": true, "charter.net": true, "earthlink.net": true, "roadrunner.com": true,
		"juno.com": true, "netzero.net": true, "mindspring.com": true, "frontier.com": true,
	}
)

var emailSuggestionTypos = map[string]string{
	"gmial.com":   "gmail.com",
	"gmai.com":    "gmail.com",
	"gnail.com":   "gmail.com",
	"gmal.com":    "gmail.com",
	"gmail.co":    "gmail.com",
	"gmail.cm":    "gmail.com",
	"gmailcom":    "gmail.com",
	"gmaill.com":  "gmail.com",
	"gnail.co":    "gmail.com",
	"yahooo.com":  "yahoo.com",
	"yaho.com":    "yahoo.com",
	"yhoo.com":    "yahoo.com",
	"yahoo.co":    "yahoo.com",
	"yahoo.cm":    "yahoo.com",
	"hotmial.com": "hotmail.com",
	"hotmil.com":  "hotmail.com",
	"hotmai.com":  "hotmail.com",
	"hotmail.co":  "hotmail.com",
	"outlok.com":  "outlook.com",
	"outloo.com":  "outlook.com",
	"iclould.com": "icloud.com",
	"iclod.com":   "icloud.com",
	"iclou.com":   "icloud.com",
}

func ValidateEmail(email string) EmailValidationResult {
	start := time.Now()
	email = strings.TrimSpace(strings.ToLower(email))
	result := EmailValidationResult{
		Email:    email,
		Checks:   []EmailCheck{},
		MXRecords: []string{},
	}

	if email == "" {
		result.Error = "No email address provided"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// ── Format check ──
	parsed, err := mail.ParseAddress(email)
	if err != nil {
		result.FormatValid = false
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Syntax", Passed: false, Message: err.Error(), Weight: 30,
		})
		result.Risk = "invalid"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// mail.ParseAddress accepts "Name <addr@host>" so extract pure address
	addr := parsed.Address
	if at := strings.LastIndex(addr, "@"); at >= 0 {
		result.User = strings.ToLower(addr[:at])
		result.Domain = strings.ToLower(strings.TrimSuffix(addr[at+1:], "."))
	} else {
		result.Error = "Could not parse email"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// RFC 5321 length checks
	if len(email) > 254 {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Length", Passed: false, Message: "Email exceeds 254 characters", Weight: 10,
		})
		result.Risk = "invalid"
		result.FormatValid = false
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	if len(result.User) > 64 {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Local part", Passed: false, Message: "Local part exceeds 64 characters", Weight: 10,
		})
		result.FormatValid = false
	}

	// Strict RFC validation regex
	strictRe := regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)
	if !strictRe.MatchString(email) {
		result.FormatValid = false
		result.Checks = append(result.Checks, EmailCheck{
			Name: "RFC 5322", Passed: false, Message: "Fails strict RFC syntax", Weight: 20,
		})
	} else {
		result.FormatValid = true
		result.Checks = append(result.Checks, EmailCheck{
			Name: "RFC 5322", Passed: true, Message: "Valid format", Weight: 30,
		})
	}

	// ── Domain part must have a dot ──
	if !strings.Contains(result.Domain, ".") {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Domain", Passed: false, Message: "Domain has no TLD", Weight: 10,
		})
		result.Risk = "invalid"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// ── MX lookup ──
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	resolver := &net.Resolver{}
	mxRecords, mxErr := resolver.LookupMX(ctx, result.Domain)
	if mxErr == nil && len(mxRecords) > 0 {
		result.MXPresent = true
		for _, mx := range mxRecords {
			result.MXRecords = append(result.MXRecords, strings.TrimSuffix(mx.Host, "."))
		}
		result.Checks = append(result.Checks, EmailCheck{
			Name: "MX Records", Passed: true,
			Message: fmt.Sprintf("%d mail server(s) configured", len(mxRecords)), Weight: 25,
		})
	} else {
		// Fall back to A record check
		if ips, err := resolver.LookupIP(ctx, "ip", result.Domain); err == nil && len(ips) > 0 {
			result.MXPresent = true
			result.Checks = append(result.Checks, EmailCheck{
				Name: "A fallback", Passed: true,
				Message: "No MX — domain has A record (implicit mail)", Weight: 10,
			})
		} else {
			result.Checks = append(result.Checks, EmailCheck{
				Name: "MX Records", Passed: false,
				Message: "Domain has no mail servers", Weight: 25,
			})
		}
	}

	// ── Disposable ──
	result.Disposable = disposableDomains[result.Domain]
	if result.Disposable {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Disposable", Passed: false,
			Message: "Domain belongs to a disposable email provider", Weight: 20,
		})
	} else {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Disposable", Passed: true,
			Message: "Not a known disposable provider", Weight: 20,
		})
	}

	// ── Role-based ──
	result.RoleBased = roleBasedPrefixes[result.User]
	if result.RoleBased {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Role-based", Passed: false,
			Message: fmt.Sprintf("'%s' is a role-based address", result.User), Weight: 5,
		})
	} else {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Role-based", Passed: true,
			Message: "Personal address", Weight: 5,
		})
	}

	// ── Free provider ──
	result.FreeProvider = freeProviders[result.Domain]
	if result.FreeProvider {
		result.Checks = append(result.Checks, EmailCheck{
			Name: "Provider", Passed: true,
			Message: "Free email provider", Weight: 0,
		})
	}

	// ── Typo suggestion ──
	if sugg, ok := emailSuggestionTypos[result.Domain]; ok {
		result.Suggestion = strings.Replace(email, result.Domain, sugg, 1)
	}

	// ── Calculate score ──
	score := 0
	for _, c := range result.Checks {
		if c.Passed {
			score += c.Weight
		}
	}
	if result.Disposable {
		score = min(score, 30)
	}
	if !result.MXPresent {
		score = min(score, 20)
	}
	result.Score = score

	switch {
	case result.Score >= 90:
		result.Risk = "low"
	case result.Score >= 70:
		result.Risk = "medium"
	case result.Score >= 40:
		result.Risk = "high"
	default:
		result.Risk = "critical"
	}

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
