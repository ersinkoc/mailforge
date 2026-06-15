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

	if net.ParseIP(ip) == nil {
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

	url := fmt.Sprintf("https://ip-api.com/json/%s?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,reverse,mobile,proxy,hosting,query", ip)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err == nil {
		req.Header.Set("User-Agent", "MailForge/2.0")
		if resp, err := getHTTPClient().Do(req); err == nil {
			defer resp.Body.Close()
			var r apiResp
			if json.NewDecoder(resp.Body).Decode(&r) == nil && r.Status == "success" {
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

				// Parse "ASxxxxx Org" → ASN + name
				if r.AS != "" {
					_, _ = fmt.Sscanf(r.AS, "AS%d %s", &result.ASN, &result.ASNOrg)
				}
			}
		}
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
