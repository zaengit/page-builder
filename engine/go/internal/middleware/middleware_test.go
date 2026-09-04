package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/zaengit/page-builder/engine/go/internal/middleware"
)

func TestRequestIDAndSecurityHeaders(t *testing.T) {
	h := middleware.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if middleware.RequestIDFromContext(r.Context()) == "" {
				t.Fatal("request id missing from context")
			}
			w.WriteHeader(http.StatusNoContent)
		}),
		middleware.RequestID,
		middleware.Security,
	)

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status=%d", rr.Code)
	}
	if rr.Header().Get("X-Request-ID") == "" {
		t.Fatal("X-Request-ID header missing")
	}
	if rr.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("security headers missing")
	}
}

func TestContentTypeRejectsUnsupportedAPIMediaType(t *testing.T) {
	h := middleware.ContentType(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/pages", strings.NewReader("{}"))
	req.Header.Set("Content-Type", "text/plain")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "unsupported_media_type") {
		t.Fatalf("unexpected body=%s", rr.Body.String())
	}
}

func TestContentTypeAllowsJSONAndMultipart(t *testing.T) {
	for _, contentType := range []string{"application/json; charset=utf-8", "multipart/form-data; boundary=x"} {
		t.Run(contentType, func(t *testing.T) {
			called := false
			h := middleware.ContentType(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusNoContent)
			}))
			req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader("x"))
			req.Header.Set("Content-Type", contentType)
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			if !called || rr.Code != http.StatusNoContent {
				t.Fatalf("called=%v status=%d", called, rr.Code)
			}
		})
	}
}

func TestRequestTimeout(t *testing.T) {
	h := middleware.RequestTimeout(10 * time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(http.StatusNoContent)
	}))

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/test", nil))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "request_timeout") {
		t.Fatalf("unexpected body=%s", rr.Body.String())
	}
}
