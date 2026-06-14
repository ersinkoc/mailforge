# MailForge Development Commands
# Usage: make <target>

.PHONY: help install dev test test-race test-ci build build-web lint lint-fix format check clean

# Default target
help:
	@echo "MailForge Development Commands"
	@echo ""
	@echo "  make install      Install all dependencies"
	@echo "  make dev          Start development server"
	@echo "  make test         Run all Go tests"
	@echo "  make test-race    Run tests with race detector"
	@echo "  make test-ci      Run tests for CI (with timeouts)"
	@echo "  make build        Build the application"
	@echo "  make build-web    Build the web frontend only"
	@echo "  make lint         Run linters"
	@echo "  make lint-fix     Fix linting issues"
	@echo "  make format       Format code"
	@echo "  make check        Run all checks"
	@echo "  make clean        Clean build artifacts"
	@echo ""

# Install dependencies
install:
	@echo "Installing Go dependencies..."
	go mod download
	@echo "Installing web dependencies..."
	cd web && npm install

# Run development (requires running services)
dev:
	@echo "Starting MailForge..."
	cd web && npm run dev &
	go run main.go

# Run Go tests
test:
	go test -v -timeout 180s ./...

# Run tests with race detector
test-race:
	go test -race -v -timeout 120s ./...

# Run tests for CI (optimized for CI environments)
test-ci:
	go test -v -timeout 180s -short ./...

# Build the application
build: build-web
	go build -o mailforge .

# Build web frontend only
build-web:
	cd web && npm run build

# Run linters
lint:
	@echo "Running Go vet..."
	go vet ./...
	@echo "Running web linter..."
	cd web && npm run lint || true

# Fix linting issues
lint-fix:
	@echo "Running Go fmt..."
	go fmt ./...
	@echo "Running web linter fix..."
	cd web && npm run lint:fix || true

# Format code
format:
	go fmt ./...
	cd web && npm run format || true

# Run all checks
check: lint
	go build ./...
	cd web && npx tsc --noEmit

# Clean build artifacts
clean:
	rm -f mailforge mailforge.exe
	rm -rf web/dist
	cd web && rm -rf dist node_modules/.cache

# Setup git hooks
hooks:
	@echo "Setting up git hooks..."
	@which pre-commit > /dev/null 2>&1 && pre-commit install || echo "pre-commit not installed. Using manual hooks."
	@echo "Creating manual pre-commit hook..."
	@mkdir -p .git/hooks
	@echo "#!/bin/sh" > .git/hooks/pre-commit
	@echo "echo 'Running pre-commit checks...'" >> .git/hooks/pre-commit
	@echo "make lint-fix" >> .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Manual pre-commit hook created. Install pre-commit for better experience."

# Docker commands
docker-build:
	docker build -t mailforge:latest .

docker-run:
	docker run -p 8080:8080 mailforge:latest

# Full CI simulation (runs locally what CI would run)
ci: test-ci check build
	@echo "CI checks passed!"

# Show test coverage
coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Show test output by package
test-verbose:
	go test -v ./... 2>&1 | grep -E "^(=== RUN|--- PASS|--- FAIL|PASS|FAIL|ok)"
