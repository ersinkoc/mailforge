package tools

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"strings"
	"time"
)

func TestSMTP(host string, port int) SMTPTestResult {
	start := time.Now()
	result := SMTPTestResult{
		Host:        host,
		Port:        port,
		AuthMethods: []string{},
	}

	if port == 0 {
		port = 25
		result.Port = port
	}

	addr := fmt.Sprintf("%s:%d", host, port)

	// Resolve IP
	ips, err := net.LookupIP(host)
	if err == nil && len(ips) > 0 {
		result.IP = ips[0].String()
	}

	// TCP Connection
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		result.Error = fmt.Sprintf("Connection failed: %v", err)
		result.Duration = time.Since(start).Milliseconds()
		return result
	}
	result.Connected = true

	reader := bufio.NewReader(conn)

	// Read banner
	banner, err := reader.ReadString('\n')
	if err == nil {
		result.Banner = strings.TrimSpace(banner)
	}

	// Send EHLO
	fmt.Fprintf(conn, "EHLO mailtools.local\r\n")
	scanner := bufio.NewScanner(reader)
	ehloFeatures := []string{}
	starttlsSupported := false

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			break
		}
		ehloFeatures = append(ehloFeatures, line)
		upper := strings.ToUpper(line)
		if strings.Contains(upper, "STARTTLS") {
			starttlsSupported = true
		}
		if strings.Contains(upper, "AUTH") {
			// Parse auth methods
			parts := strings.Fields(line)
			if len(parts) > 1 {
				for _, m := range parts[1:] {
					result.AuthMethods = append(result.AuthMethods, m)
				}
			}
		}
	}

	result.STARTTLS = starttlsSupported

	// Try STARTTLS
	if starttlsSupported {
		fmt.Fprintf(conn, "STARTTLS\r\n")
		resp, err := reader.ReadString('\n')
		if err == nil && strings.HasPrefix(resp, "220") {
			tlsConn := tls.Client(conn, &tls.Config{
				ServerName: host,
			})
			if err := tlsConn.Handshake(); err != nil {
				// Handshake failed — close the underlying connection
				conn.Close()
				result.Error = fmt.Sprintf("TLS handshake failed: %v", err)
				result.Duration = time.Since(start).Milliseconds()
				return result
			} else {
				result.TLSVersion = tls.VersionName(tlsConn.ConnectionState().Version)
				cert := tlsConn.ConnectionState().PeerCertificates
				if len(cert) > 0 {
					result.Certificate = &TLSCertificate{
						Subject:  cert[0].Subject.CommonName,
						Issuer:   cert[0].Issuer.CommonName,
						NotAfter: cert[0].NotAfter.Format(time.RFC3339),
						Serial:   cert[0].SerialNumber.String(),
					}
				}
				// TLS connection established — close via tlsConn to flush TLS state
				tlsConn.Close()
			}
		}
	}

	// QUIT
	fmt.Fprintf(conn, "QUIT\r\n")
	conn.Close()

	result.Duration = time.Since(start).Milliseconds()
	return result
}
