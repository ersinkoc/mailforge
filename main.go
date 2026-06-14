package main

import (
	"embed"
	"errors"
	"log"
	"mailforge/internal/api"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

//go:embed all:web/dist
var staticFS embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8181"
	}

	router := api.NewRouter(staticFS)
	router.Addr = ":" + port

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 MailForge server starting on :%s", port)
		if err := router.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	sig := <-quit
	log.Printf("🛑 Received %s, shutting down gracefully...", sig)

	if err := router.Close(); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited cleanly")
}
