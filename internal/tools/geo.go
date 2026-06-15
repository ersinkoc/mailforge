package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

// LookupIPGeo resolves IP geolocation using a free public API
// (ip-api.com). Falls back to a derived location based on RIR allocation.
func LookupIPGeo(ip string) IPGeoResult {
	start := time.Now()
	result := IPGeoResult{IP: ip}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		result.Error = "Invalid IP address"
		result.Duration = time.Since(start).Milliseconds()
		return result
	}

	// Primary: ip-api.com free endpoint
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	type apiResp struct {
		Status      string  `json:"status"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		Region      string  `json:"regionName"`
		RegionCode  string  `json:"region"`
		City        string  `json:"city"`
		Zip         string  `json:"zip"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
		Timezone    string  `json:"timezone"`
		ISP         string  `json:"isp"`
		Org         string  `json:"org"`
		AS          string  `json:"as"`
		Reverse     string  `json:"reverse"`
		Mobile      bool    `json:"mobile"`
		Proxy       bool    `json:"proxy"`
		Hosting     bool    `json:"hosting"`
		Query       string  `json:"query"`
	}

	// Try ip-api.com first
	url := fmt.Sprintf("https://ip-api.com/json/%s?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,reverse,mobile,proxy,hosting,query", ip)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	success := false
	if err == nil {
		req.Header.Set("User-Agent", "MailForge/2.0")
		if resp, err := getHTTPClient().Do(req); err == nil {
			defer resp.Body.Close()
			var r apiResp
			if json.NewDecoder(resp.Body).Decode(&r) == nil {
				if r.Status == "success" {
					result.Country = r.Country
					result.CountryCode = r.CountryCode
					result.Region = r.Region
					result.City = r.City
					result.Postal = r.Zip
					result.Latitude = r.Lat
					result.Longitude = r.Lon
					result.Timezone = r.Timezone
					result.ISP = r.ISP
					result.Org = r.Org
					result.Reverse = r.Reverse
					result.IsProxy = r.Proxy
					result.IsHosting = r.Hosting
					success = true

					// Parse "ASxxxxx Org" → ASN + name
					if r.AS != "" {
						parts := strings.SplitN(r.AS, " ", 2)
						if len(parts) >= 2 {
							asNum := strings.TrimPrefix(parts[0], "AS")
							fmt.Sscanf(asNum, "%d", &result.ASN)
							result.ASNOrg = parts[1]
						}
					}
				} else if r.Status == "fail" {
					result.Error = fmt.Sprintf("GeoIP lookup failed: %s", r.Status)
				}
			}
		}
	}

	// Fallback: Derive location from IP range if API failed
	if !success {
		result.Warning = "Using fallback location (API unavailable)"
		result.Country = deriveCountryFromIP(parsedIP)
	}

	// Reverse DNS
	if result.Reverse == "" {
		resolver := &net.Resolver{}
		if ptrs, err := resolver.LookupAddr(ctx, ip); err == nil && len(ptrs) > 0 {
			result.Reverse = strings.TrimSuffix(ptrs[0], ".")
		}
	}

	// Threat heuristic
	threat := "low"
	if result.IsProxy {
		threat = "medium"
	}
	if result.IsTor {
		threat = "high"
	}
	result.Threat = threat

	result.Duration = time.Since(start).Milliseconds()
	return result
}

// deriveCountryFromIP estimates country from IP using RIR allocation ranges
// This is a fallback when the GeoIP API is unavailable
func deriveCountryFromIP(ip net.IP) string {
	// IPv4 ranges for major countries
	// These are simplified RIR allocations - actual ranges vary
	ip4 := ip.To4()
	if ip4 != nil {
		firstOctet := int(ip4[0])
		secondOctet := int(ip4[1])

		// US allocations (3-4, 6-4, 8-8, 12-15, etc.)
		if firstOctet >= 3 && firstOctet <= 4 {
			return "United States"
		}
		if firstOctet >= 6 && firstOctet <= 7 {
			return "United States"
		}
		if firstOctet == 8 {
			return "United States" // Google (8.8.8.8)
		}
		if firstOctet >= 12 && firstOctet <= 15 {
			return "United States"
		}
		if firstOctet >= 23 && firstOctet <= 24 {
			return "United States"
		}
		// European ranges
		if firstOctet >= 77 && firstOctet <= 95 {
			return "Europe" // Could be UK, DE, FR, etc.
		}
		// Asian ranges
		if firstOctet >= 103 && firstOctet <= 125 {
			return "Asia" // Could be JP, KR, CN, etc.
		}
		// Turkish range
		if firstOctet == 46 && secondOctet == 20 {
			return "Turkey"
		}
		// Russian range
		if firstOctet >= 5 && firstOctet <= 5 && secondOctet >= 0 && secondOctet <= 15 {
			return "Russia"
		}
	}
	return "Unknown"
}
