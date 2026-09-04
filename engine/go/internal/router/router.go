package router

import (
	"context"
	"net/http"
	"time"

	blockhandler "github.com/zaengit/page-builder/engine/go/internal/block/handler"
	datasourcehandler "github.com/zaengit/page-builder/engine/go/internal/datasource/handler"
	mediahandler "github.com/zaengit/page-builder/engine/go/internal/media/handler"
	"github.com/zaengit/page-builder/engine/go/internal/middleware"
	pagehandler "github.com/zaengit/page-builder/engine/go/internal/page/handler"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	renderhandler "github.com/zaengit/page-builder/engine/go/internal/render/handler"
	settinghandler "github.com/zaengit/page-builder/engine/go/internal/setting/handler"
	"gorm.io/gorm"
)

type Dependencies struct {
	DB                *gorm.DB
	Pages             *pagehandler.Handler
	Media             *mediahandler.Handler
	Blocks            *blockhandler.Handler
	Datasources       *datasourcehandler.Handler
	Render            *renderhandler.Handler
	Settings          *settinghandler.Handler
	CORSOrigins       []string
	RequestTimeout    time.Duration
	StorageDir        string
	PublicStoragePath string
}

func New(d Dependencies) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		sqlDB, err := d.DB.DB()
		if err != nil || sqlDB.PingContext(ctx) != nil {
			response.Error(w, http.StatusServiceUnavailable, "not_ready", "database unavailable")
			return
		}
		response.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	mux.HandleFunc("GET /api/pages", d.Pages.List)
	mux.HandleFunc("POST /api/pages", d.Pages.Create)
	mux.HandleFunc("GET /api/pages/{id}", d.Pages.Get)
	mux.HandleFunc("PATCH /api/pages/{id}", d.Pages.Update)
	mux.HandleFunc("PUT /api/pages/{id}", d.Pages.Update)
	mux.HandleFunc("DELETE /api/pages/{id}", d.Pages.Delete)
	mux.HandleFunc("POST /api/pages/{id}/duplicate", d.Pages.Duplicate)
	mux.HandleFunc("POST /api/pages/{id}/publish", d.Pages.Publish)
	mux.HandleFunc("POST /api/pages/{id}/unpublish", d.Pages.Unpublish)

	mux.HandleFunc("GET /api/blocks", d.Blocks.List)
	mux.HandleFunc("GET /api/blocks/{type}", d.Blocks.Get)

	mux.HandleFunc("GET /api/media", d.Media.List)
	mux.HandleFunc("POST /api/media", d.Media.Upload)
	mux.HandleFunc("GET /api/media/{id}", d.Media.Get)
	mux.HandleFunc("DELETE /api/media/{id}", d.Media.Delete)

	mux.HandleFunc("GET /api/datasources", d.Datasources.List)
	mux.HandleFunc("PUT /api/datasources/{name}", d.Datasources.Register)
	mux.HandleFunc("POST /api/datasources/query", d.Datasources.Query)
	mux.HandleFunc("GET /api/datasources/{resource}/metadata", d.Datasources.Metadata)

	mux.HandleFunc("GET /api/settings", d.Settings.Get)
	mux.HandleFunc("PUT /api/settings", d.Settings.Put)

	mux.HandleFunc("POST /api/render/page", d.Render.Preview)
	mux.HandleFunc("POST /api/render/block", d.Render.BlockPreview)

	mux.Handle(d.PublicStoragePath+"/", http.StripPrefix(d.PublicStoragePath+"/", http.FileServer(http.Dir(d.StorageDir))))
	mux.HandleFunc("GET /{slug}", d.Render.Frontend)

	return middleware.Chain(
		mux,
		middleware.RequestID,
		middleware.Recover,
		middleware.Logger,
		middleware.Security,
		middleware.CORS(d.CORSOrigins),
		middleware.ContentType,
		middleware.RequestTimeout(d.RequestTimeout),
	)
}
