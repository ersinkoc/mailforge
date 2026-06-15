package tools

import (
	"context"
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	defaultHTTPClient     = &http.Client{Timeout: 6 * time.Second}
	defaultHTTPClientOnce sync.Once
)

func getHTTPClient() *http.Client {
	defaultHTTPClientOnce.Do(func() {
		tr := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
			DialContext: (&net.Dialer{
				Timeout:   5 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			MaxIdleConns:          10,
			IdleConnTimeout:       30 * time.Second,
			TLSHandshakeTimeout:   5 * time.Second,
			ResponseHeaderTimeout: 5 * time.Second,
		}
		defaultHTTPClient = &http.Client{Transport: tr, Timeout: 8 * time.Second}
	})
	return defaultHTTPClient
}

func InspectTLS(host string, port int) TLSInspectResult {
	start := time.Now()
	result := TLSInspectResult{
		Host:   host,
		Port:   port,
		Issues: []TLSIssue{},
		Chain:  []CertDetail{},
		ALPN:   []string{},
	}

	if port == 0 {
		port = 443
		result.Port = port
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	dialer := &net.Dialer{Timeout: 8 * time.Second}

	rawConn, err := dialer.DialContext(context.Background(), "tcp", addr)
	if err != nil {
		result.Error = fmt.Sprintf("Connection failed: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	conn := tls.Client(rawConn, &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	})
	if err := conn.HandshakeContext(context.Background()); err != nil {
		rawConn.Close()
		result.Error = fmt.Sprintf("TLS handshake failed: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	defer conn.Close()

	result.Reachable = true
	state := conn.ConnectionState()
	result.Version = tls.VersionName(state.Version)
	result.OCSPStapled = state.OCSPResponse != nil
	if state.CipherSuite != 0 {
		result.Cipher = tls.CipherSuiteName(state.CipherSuite)
	}
	if state.NegotiatedProtocol != "" {
		result.ALPN = append(result.ALPN, state.NegotiatedProtocol)
	}

	// ── Process certificate chain ──
	for i, cert := range state.PeerCertificates {
		cd := buildCertDetail(cert)
		if i == 0 {
			result.Certificate = &cd
		} else {
			result.Chain = append(result.Chain, cd)
		}
	}

	// ── Grade the certificate ──
	score := 100
	if result.Certificate != nil {
		c := result.Certificate

		if c.Expired {
			score -= 50
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "critical", Code: "CERT_EXPIRED",
				Message: "Certificate has expired",
			})
		} else if c.DaysLeft < 7 {
			score -= 25
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "critical", Code: "CERT_EXPIRING",
				Message: fmt.Sprintf("Certificate expires in %d days", c.DaysLeft),
			})
		} else if c.DaysLeft < 30 {
			score -= 10
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "warning", Code: "CERT_EXPIRING",
				Message: fmt.Sprintf("Certificate expires in %d days", c.DaysLeft),
			})
		}

		if c.SelfSigned {
			score -= 30
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "warning", Code: "SELF_SIGNED",
				Message: "Certificate is self-signed",
			})
		}

		if c.KeyAlg == "RSA" && c.KeyBits < 2048 {
			score -= 20
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "warning", Code: "WEAK_KEY",
				Message: fmt.Sprintf("Weak RSA key: %d bits", c.KeyBits),
			})
		}

		sigLower := strings.ToLower(c.SignatureAlg)
		if strings.Contains(sigLower, "sha1") || strings.Contains(sigLower, "md5") {
			score -= 25
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "critical", Code: "WEAK_SIG",
				Message: "Weak signature algorithm: " + c.SignatureAlg,
			})
		}

		// Check SANs include the requested host
		hostMatched := false
		hostLower := strings.ToLower(host)
		if strings.EqualFold(c.Subject, host) || strings.EqualFold(c.Subject, "CN="+host) {
			hostMatched = true
		}
		for _, san := range c.SANs {
			s := strings.ToLower(san)
			if s == hostLower {
				hostMatched = true
				break
			}
			if strings.HasPrefix(s, "*.") {
				base := s[2:]
				if strings.HasSuffix(hostLower, "."+base) || hostLower == base {
					hostMatched = true
					break
				}
			}
		}
		if !hostMatched {
			score -= 15
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "warning", Code: "HOSTNAME_MISMATCH",
				Message: "Certificate does not match the requested hostname",
			})
		}
	}

	switch state.Version {
	case tls.VersionTLS10:
		score -= 30
		result.Issues = append(result.Issues, TLSIssue{
			Severity: "critical", Code: "TLS_1_0",
			Message: "Server supports deprecated TLS 1.0",
		})
	case tls.VersionTLS11:
		score -= 20
		result.Issues = append(result.Issues, TLSIssue{
			Severity: "critical", Code: "TLS_1_1",
			Message: "Server supports deprecated TLS 1.1",
		})
	}

	if port == 443 || port == 80 {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		if hstsValue, ok := checkHSTS(ctx, host, port); ok {
			result.HSTS = true
			_ = hstsValue
		} else {
			result.Issues = append(result.Issues, TLSIssue{
				Severity: "info", Code: "NO_HSTS",
				Message: "HSTS header not detected",
			})
			score -= 5
		}
	}

	if score < 0 {
		score = 0
	}
	result.Score = score
	result.Grade = scoreToGrade(score)

	result.Duration = time.Since(start).Milliseconds()
	return result
}

func buildCertDetail(cert *x509.Certificate) CertDetail {
	cd := CertDetail{
		Subject:      cert.Subject.String(),
		Issuer:       cert.Issuer.String(),
		Serial:       cert.SerialNumber.String(),
		NotBefore:    cert.NotBefore.Format(time.RFC3339),
		NotAfter:     cert.NotAfter.Format(time.RFC3339),
		DaysLeft:     int(time.Until(cert.NotAfter).Hours() / 24),
		SANs:         cert.DNSNames,
		SignatureAlg: cert.SignatureAlgorithm.String(),
		SelfSigned:   cert.Subject.String() == cert.Issuer.String(),
		Expired:      time.Now().After(cert.NotAfter),
		Valid:        !time.Now().After(cert.NotAfter) && cert.NotBefore.Before(time.Now()),
		Fingerprint:  sha256Hex(cert.Raw),
	}

	switch pub := cert.PublicKey.(type) {
	case *rsa.PublicKey:
		cd.KeyAlg = "RSA"
		cd.KeyBits = pub.N.BitLen()
	case *ecdsa.PublicKey:
		cd.KeyAlg = "ECDSA"
		cd.KeyBits = pub.Curve.Params().BitSize
	default:
		switch cert.PublicKeyAlgorithm {
		case x509.Ed25519:
			cd.KeyAlg = "Ed25519"
			cd.KeyBits = 256
		case x509.DSA:
			cd.KeyAlg = "DSA"
		}
	}
	return cd
}

func sha256Hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func scoreToGrade(score int) string {
	switch {
	case score >= 95:
		return "A+"
	case score >= 85:
		return "A"
	case score >= 75:
		return "B"
	case score >= 60:
		return "C"
	case score >= 40:
		return "D"
	default:
		return "F"
	}
}

func checkHSTS(ctx context.Context, host string, port int) (string, bool) {
	scheme := "https"
	if port == 80 {
		scheme = "http"
	}
	url := fmt.Sprintf("%s://%s/", scheme, host)
	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	if err != nil {
		return "", false
	}
	req.Header.Set("User-Agent", "MailForge/2.0")
	client := getHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return "", false
	}
	defer resp.Body.Close()
	hsts := resp.Header.Get("Strict-Transport-Security")
	return hsts, hsts != ""
}
