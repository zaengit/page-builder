package router_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	blockhandler "github.com/zaengit/page-builder/engine/go/internal/block/handler"
	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	"github.com/zaengit/page-builder/engine/go/internal/database"
	datasourcehandler "github.com/zaengit/page-builder/engine/go/internal/datasource/handler"
	datasourcerepo "github.com/zaengit/page-builder/engine/go/internal/datasource/repository"
	datasourcesvc "github.com/zaengit/page-builder/engine/go/internal/datasource/service"
	mediahandler "github.com/zaengit/page-builder/engine/go/internal/media/handler"
	mediarepo "github.com/zaengit/page-builder/engine/go/internal/media/repository"
	mediasvc "github.com/zaengit/page-builder/engine/go/internal/media/service"
	pagehandler "github.com/zaengit/page-builder/engine/go/internal/page/handler"
	pagerepo "github.com/zaengit/page-builder/engine/go/internal/page/repository"
	pagesvc "github.com/zaengit/page-builder/engine/go/internal/page/service"
	renderengine "github.com/zaengit/page-builder/engine/go/internal/render/engine"
	renderhandler "github.com/zaengit/page-builder/engine/go/internal/render/handler"
	rendersvc "github.com/zaengit/page-builder/engine/go/internal/render/service"
	"github.com/zaengit/page-builder/engine/go/internal/router"
	settinghandler "github.com/zaengit/page-builder/engine/go/internal/setting/handler"
	settingrepo "github.com/zaengit/page-builder/engine/go/internal/setting/repository"
	settingsvc "github.com/zaengit/page-builder/engine/go/internal/setting/service"
	"gorm.io/gorm"
)

type envelope struct {
	Data json.RawMessage `json:"data"`
}

type pageRecord struct {
	ID     uint   `json:"id"`
	Slug   string `json:"slug"`
	Status string `json:"status"`
}

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatal(err)
	}

	pages := pagesvc.New(pagerepo.New(db))
	blocksRoot, err := filepath.Abs("../../../../blocks")
	if err != nil {
		t.Fatal(err)
	}
	blocks := blocksvc.New(blocksRoot)
	media := mediasvc.New(mediarepo.New(db), t.TempDir(), "/media", 1<<20)
	settings := settingsvc.New(settingrepo.New(db))
	datasources := datasourcesvc.New(datasourcerepo.New(db))
	renderer := renderengine.NewWithProvider(renderengine.DatasourceProvider{Adapter: datasources})

	return router.New(router.Dependencies{
		DB:                db,
		Pages:             pagehandler.New(pages),
		Media:             mediahandler.New(media, 1<<20),
		Blocks:            blockhandler.New(blocks),
		Datasources:       datasourcehandler.New(datasources),
		Render:            renderhandler.New(rendersvc.New(pages, blocks, renderer)),
		Settings:          settinghandler.New(settings),
		RequestTimeout:    time.Second,
		StorageDir:        t.TempDir(),
		PublicStoragePath: "/media",
	})
}

func request(t *testing.T, handler http.Handler, method, path string, body []byte, contentType string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	return rr
}

func TestCMSHTTPPageLifecycleAndRendering(t *testing.T) {
	handler := testHandler(t)

	health := request(t, handler, http.MethodGet, "/health", nil, "")
	if health.Code != http.StatusOK || health.Header().Get("X-Request-ID") == "" {
		t.Fatalf("health status=%d headers=%v", health.Code, health.Header())
	}
	ready := request(t, handler, http.MethodGet, "/ready", nil, "")
	if ready.Code != http.StatusOK {
		t.Fatalf("ready status=%d body=%s", ready.Code, ready.Body.String())
	}

	createBody := []byte(`{"title":"Smoke Page","slug":"smoke-page","content":{"version":1,"blocks":[]}}`)
	created := request(t, handler, http.MethodPost, "/api/pages", createBody, "application/json")
	if created.Code != http.StatusCreated {
		t.Fatalf("create status=%d body=%s", created.Code, created.Body.String())
	}
	var createdEnvelope envelope
	if err := json.Unmarshal(created.Body.Bytes(), &createdEnvelope); err != nil {
		t.Fatal(err)
	}
	var page pageRecord
	if err := json.Unmarshal(createdEnvelope.Data, &page); err != nil {
		t.Fatal(err)
	}
	if page.ID == 0 || page.Slug != "smoke-page" || page.Status != "draft" {
		t.Fatalf("unexpected page: %#v", page)
	}

	published := request(t, handler, http.MethodPost, "/api/pages/1/publish", nil, "")
	if published.Code != http.StatusOK {
		t.Fatalf("publish status=%d body=%s", published.Code, published.Body.String())
	}
	frontend := request(t, handler, http.MethodGet, "/smoke-page", nil, "")
	if frontend.Code != http.StatusOK || frontend.Header().Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("frontend status=%d headers=%v body=%s", frontend.Code, frontend.Header(), frontend.Body.String())
	}

	previewBody := []byte(`{"page":{"version":1,"blocks":[]},"context":{}}`)
	preview := request(t, handler, http.MethodPost, "/api/render/page", previewBody, "application/json")
	if preview.Code != http.StatusOK {
		t.Fatalf("preview status=%d body=%s", preview.Code, preview.Body.String())
	}
}

func TestCMSHTTPServesOnlyDeclaredBlockAssets(t *testing.T) {
	handler := testHandler(t)

	css := request(t, handler, http.MethodGet, "/block-assets/core/carousel/style.css", nil, "")
	if css.Code != http.StatusOK {
		t.Fatalf("css status=%d body=%s", css.Code, css.Body.String())
	}
	if got := css.Header().Get("Content-Type"); got != "text/css; charset=utf-8" {
		t.Fatalf("css content type=%q", got)
	}
	if !strings.Contains(css.Body.String(), ".pb-carousel") {
		t.Fatal("carousel stylesheet was not served")
	}

	js := request(t, handler, http.MethodGet, "/block-assets/core/carousel/frontend.js", nil, "")
	if js.Code != http.StatusOK {
		t.Fatalf("js status=%d body=%s", js.Code, js.Body.String())
	}
	if got := js.Header().Get("Content-Type"); got != "text/javascript; charset=utf-8" {
		t.Fatalf("js content type=%q", got)
	}

	missing := request(t, handler, http.MethodGet, "/block-assets/core/carousel/template.html", nil, "")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("undeclared asset status=%d body=%s", missing.Code, missing.Body.String())
	}
}

func TestCMSHTTPPublishesBlockAssetURLsInRenderResponse(t *testing.T) {
	handler := testHandler(t)
	body := []byte(`{"page":{"version":1,"blocks":[{"id":"carousel-1","type":"core/carousel","attrs":{}}]},"context":{}}`)
	rr := request(t, handler, http.MethodPost, "/api/render/page", body, "application/json")
	if rr.Code != http.StatusOK {
		t.Fatalf("render status=%d body=%s", rr.Code, rr.Body.String())
	}

	var out struct {
		Data struct {
			Assets struct {
				CSS []string `json:"css"`
				JS  []string `json:"js"`
			} `json:"assets"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if got := out.Data.Assets.CSS; len(got) != 1 || got[0] != "/block-assets/core/carousel/style.css" {
		t.Fatalf("css assets=%v", got)
	}
	if got := out.Data.Assets.JS; len(got) != 1 || got[0] != "/block-assets/core/carousel/frontend.js" {
		t.Fatalf("js assets=%v", got)
	}
}

func TestCMSHTTPRejectsUnsupportedContentType(t *testing.T) {
	handler := testHandler(t)
	rr := request(t, handler, http.MethodPost, "/api/pages", []byte(`{}`), "text/plain")
	if rr.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCMSHTTPContextCancellationPropagates(t *testing.T) {
	handler := testHandler(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	req := httptest.NewRequest(http.MethodGet, "/api/pages", nil).WithContext(ctx)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code == 0 {
		t.Fatal("expected an HTTP response")
	}
}
