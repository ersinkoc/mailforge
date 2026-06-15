package api

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
)

// WebSocket is a minimal RFC 6455 implementation supporting only the
// "text" and "close" frames. Sufficient for broadcasting monitor updates
// from the MailForge backend to the React UI.

const (
	wsGUID  = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
	wsText  = 0x1
	wsClose = 0x8
	wsPing  = 0x9
	wsPong  = 0xA
)

type wsConn struct {
	netConn net.Conn
	mu      sync.Mutex
	closed  bool
}

// UpgradeWebSocket performs the HTTP/1.1 -> WebSocket upgrade handshake.
func UpgradeWebSocket(w http.ResponseWriter, r *http.Request) (*wsConn, error) {
	// Per RFC 7230, header values are case-insensitive. Go canonicalizes
	// some values (Upgrade becomes "WebSocket" in newer Go versions).
	upgrade := strings.ToLower(r.Header.Get("Upgrade"))
	connection := strings.ToLower(r.Header.Get("Connection"))
	if upgrade != "websocket" {
		return nil, fmt.Errorf("not a websocket upgrade (got upgrade=%q connection=%q)", r.Header.Get("Upgrade"), r.Header.Get("Connection"))
	}
	if !strings.Contains(connection, "upgrade") {
		return nil, fmt.Errorf("missing Connection: Upgrade (got connection=%q)", r.Header.Get("Connection"))
	}
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, errors.New("missing Sec-WebSocket-Key")
	}

	hj, ok := w.(http.Hijacker)
	if !ok {
		return nil, errors.New("server does not support hijacking")
	}
	conn, bufrw, err := hj.Hijack()
	if err != nil {
		return nil, err
	}
	if err := bufrw.Flush(); err != nil {
		conn.Close()
		return nil, err
	}

	// Per RFC 6455 §4.2.1, Sec-WebSocket-Key is a base64-encoded 16-byte nonce.
	// It must be base64-decoded before being hashed with the GUID.
	decodedKey, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		conn.Close()
		return nil, errors.New("invalid Sec-WebSocket-Key")
	}
	h := sha1.New()
	h.Write(append(decodedKey, wsGUID...))
	accept := base64.StdEncoding.EncodeToString(h.Sum(nil))

	resp := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
	if _, err := conn.Write([]byte(resp)); err != nil {
		conn.Close()
		return nil, err
	}
	return &wsConn{netConn: conn}, nil
}

// WriteText sends a single text frame.
func (w *wsConn) WriteText(payload []byte) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.closed {
		return errors.New("closed")
	}
	header := make([]byte, 2)
	header[0] = 0x80 | wsText // FIN=1, opcode=1
	length := len(payload)
	var ext []byte
	switch {
	case length < 126:
		header[1] = byte(length)
	case length < 65536:
		header[1] = 126
		ext = make([]byte, 2)
		binary.BigEndian.PutUint16(ext, uint16(length))
	default:
		header[1] = 127
		ext = make([]byte, 8)
		binary.BigEndian.PutUint64(ext, uint64(length))
	}
	frame := append(header, ext...)
	frame = append(frame, payload...)
	_, err := w.netConn.Write(frame)
	return err
}

// ReadMessage reads a single text frame and returns the payload.
func (w *wsConn) ReadMessage() (int, []byte, error) {
	var hdr [2]byte
	if _, err := io.ReadFull(w.netConn, hdr[:]); err != nil {
		return 0, nil, err
	}
	fin := hdr[0]&0x80 != 0
	opcode := int(hdr[0] & 0x0F)
	length := int(hdr[1] & 0x7F)
	switch length {
	case 126:
		var ext [2]byte
		if _, err := io.ReadFull(w.netConn, ext[:]); err != nil {
			return 0, nil, err
		}
		length = int(binary.BigEndian.Uint16(ext[:]))
	case 127:
		var ext [8]byte
		if _, err := io.ReadFull(w.netConn, ext[:]); err != nil {
			return 0, nil, err
		}
		length = int(binary.BigEndian.Uint64(ext[:]))
	}
	payload := make([]byte, length)
	if length > 0 {
		if _, err := io.ReadFull(w.netConn, payload); err != nil {
			return 0, nil, err
		}
	}
	if opcode == wsClose {
		w.Close()
		return opcode, nil, io.EOF
	}
	if !fin {
		return opcode, payload, nil
	}
	return opcode, payload, nil
}

func (w *wsConn) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.closed {
		return nil
	}
	w.closed = true
	// Best-effort close frame
	_, _ = w.netConn.Write([]byte{0x88, 0x00})
	return w.netConn.Close()
}

// HandleMonitorWS upgrades a connection and streams monitor updates to it.
func HandleMonitorWS(w http.ResponseWriter, r *http.Request) {
	conn, err := UpgradeWebSocket(w, r)
	if err != nil {
		http.Error(w, "websocket upgrade failed: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Send initial snapshot
	monitors := ListMonitors()
	snapshot := map[string]interface{}{
		"type":     "monitor_snapshot",
		"monitors": monitors,
	}
	snapshotData, _ := json.Marshal(snapshot)
	_ = conn.WriteText(snapshotData)

	// Subscribe to monitor updates for broadcast
	sub := SubscribeMonitor()
	defer UnsubscribeMonitor(sub)

	// Drain incoming frames in a goroutine
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case data, ok := <-sub:
			if !ok {
				return
			}
			if err := conn.WriteText(data); err != nil {
				return
			}
		}
	}
}
