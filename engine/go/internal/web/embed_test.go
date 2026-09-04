package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerServesEditorIndexWithoutRedirect(t *testing.T) {
	handler := http.StripPrefix("/admin", New())

	for _, requestPath := range []string{"/admin/", "/admin/index.html", "/admin/pages/1"} {
		req := httptest.NewRequest(http.MethodGet, requestPath, nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK {
			t.Fatalf("GET %s: status=%d, location=%q", requestPath, recorder.Code, recorder.Header().Get("Location"))
		}
		if recorder.Header().Get("Location") != "" {
			t.Fatalf("GET %s: unexpected redirect to %q", requestPath, recorder.Header().Get("Location"))
		}
		if !strings.Contains(recorder.Body.String(), `data-page-builder-root`) {
			t.Fatalf("GET %s: editor index was not served", requestPath)
		}
	}
}

func TestHandlerServesPreviewShell(t *testing.T) {
	handler := http.StripPrefix("/admin", New())
	req := httptest.NewRequest(http.MethodGet, "/admin/preview.html", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("GET /admin/preview.html: status=%d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `<main id="preview"></main>`) {
		t.Fatal("preview shell was not served")
	}
}
