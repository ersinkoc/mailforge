# Build frontend
FROM node:24-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Build Go binary
FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o /mailforge .

# Final image
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=backend /mailforge .
EXPOSE 8080
ENV PORT=8080
ENV GIN_MODE=release
LABEL org.opencontainers.image.title="MailForge" \
      org.opencontainers.image.description="Comprehensive email infrastructure diagnostic suite" \
      org.opencontainers.image.source="https://github.com/local/mailforge" \
      org.opencontainers.image.licenses="MIT"
ENTRYPOINT ["./mailforge"]
