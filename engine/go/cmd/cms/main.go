package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	blockhandler "github.com/zaengit/page-builder/engine/go/internal/block/handler"
	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	"github.com/zaengit/page-builder/engine/go/internal/config"
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
	"github.com/zaengit/page-builder/engine/go/internal/web"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Printf("%s %s specification=%d\n", renderengine.RuntimeName, renderengine.EngineVersion, renderengine.SpecificationVersion)
		return
	}

	cfg, err := config.Load()
	if err != nil {
		slog.Error("configuration error", "error", err)
		os.Exit(2)
	}

	db, err := database.Open(cfg)
	if err != nil {
		slog.Error("database error", "error", err)
		os.Exit(3)
	}
	defer func() {
		if err := database.Close(db); err != nil {
			slog.Error("database close error", "error", err)
		}
	}()

	if cfg.MigrateOnStart {
		if err := database.Migrate(db); err != nil {
			slog.Error("migration error", "error", err)
			os.Exit(4)
		}
	}

	pageRepository := pagerepo.New(db)
	pageService := pagesvc.New(pageRepository)
	blockService := blocksvc.New(cfg.BlockRoot)
	mediaRepository := mediarepo.New(db)
	mediaService := mediasvc.New(mediaRepository, cfg.StoragePath, cfg.PublicStoragePath, cfg.MaxUploadBytes)
	settingRepository := settingrepo.New(db)
	settingService := settingsvc.New(settingRepository)
	datasourceRepository := datasourcerepo.New(db)
	datasourceService := datasourcesvc.New(datasourceRepository)
	renderer := renderengine.NewWithProvider(renderengine.DatasourceProvider{Adapter: datasourceService})
	renderHandler := renderhandler.New(rendersvc.New(pageService, blockService, renderer))

	handler := router.New(router.Dependencies{
		DB:                db,
		Pages:             pagehandler.New(pageService),
		Media:             mediahandler.New(mediaService, cfg.MaxUploadBytes),
		Blocks:            blockhandler.New(blockService),
		Datasources:       datasourcehandler.New(datasourceService),
		Render:            renderHandler,
		Settings:          settinghandler.New(settingService),
		Editor:            web.New(),
		CORSOrigins:       cfg.CORSOrigins,
		RequestTimeout:    cfg.RequestTimeout,
		StorageDir:        cfg.StoragePath,
		PublicStoragePath: cfg.PublicStoragePath,
	})

	server := &http.Server{
		Addr:              cfg.HTTPAddress,
		Handler:           handler,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("Go CMS started", "addr", cfg.HTTPAddress, "database", cfg.DatabaseDriver, "editor", "/admin/")
		errCh <- server.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-stop:
		slog.Info("shutdown requested", "signal", sig.String())
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(5)
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
		os.Exit(6)
	}
	slog.Info("Go CMS stopped")
}
