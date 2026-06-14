# MailForge

**Comprehensive Email Infrastructure Diagnostic Suite**

MailForge is a Go-based API and React-based WebUI that provides detailed diagnostics for email infrastructure including SPF, DKIM, DMARC, DNS, TLS, and deliverability analysis.

## Features

- **Email Authentication**: SPF, DKIM, DMARC validation and analysis
- **DNS Analysis**: DNS lookup, DNSSEC verification, blacklist checking
- **Network Diagnostics**: Port scanning, traceroute, HTTP headers analysis
- **TLS Security**: SMTP TLS capability and configuration checking
- **Real-time Monitoring**: WebSocket-based live diagnostic monitoring
- **Deliverability Score**: Comprehensive email deliverability assessment

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm/pnpm

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ersinkoc/mailforge.git
cd mailforge

# Install web frontend dependencies
cd web && npm install && cd ..

# Build everything
make build

# Or build individually
make build-go    # Build Go backend
make build-web   # Build React frontend
```

### Run

```bash
# Development
make dev

# Production
make run
```

The API server starts at `http://localhost:8181`

## Development

```bash
# Run tests
make test

# Run with race detector
make test-race

# Lint code
make lint

# Fix linting issues
make lint-fix

# Format code
make format

# Run all checks
make check
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check with uptime |
| `/metrics` | GET | Service metrics |
| `/openapi` | GET | OpenAPI 3.0 specification |
| `/ws/monitor` | WS | WebSocket monitor |
| `/api/dns` | POST | DNS lookups |
| `/api/blacklist` | POST | Blacklist checking |
| `/api/portscan` | POST | Port scanning |
| `/api/smtp` | POST | SMTP diagnostics |
| `/api/tls` | POST | TLS analysis |
| `/api/dmarc` | POST | DMARC validation |
| `/api/dkim` | POST | DKIM verification |
| `/api/dnssec` | POST | DNSSEC validation |
| `/api/deliverability` | POST | Email deliverability |
| `/api/geo` | POST | Geolocation lookup |
| `/api/http` | POST | HTTP headers |

## Docker

```bash
# Build Docker image
make docker-build

# Run container
docker run -p 8181:8181 mailforge:latest
```

## Tech Stack

- **Backend**: Go 1.21+, net/http, gorilla/websocket
- **Frontend**: React 19, TypeScript, Vite, Radix UI, Tailwind CSS
- **Testing**: Go testing, Vitest
- **CI/CD**: GitHub Actions

## License

MIT
