package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
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
	renderhandler "github.com/zaengit/page-builder/engine/go/internal/render/handler"
	rendersvc "github.com/zaengit/page-builder/engine/go/internal/render/service"
	"github.com/zaengit/page-builder/engine/go/internal/router"
	settinghandler "github.com/zaengit/page-builder/engine/go/internal/setting/handler"
	settingrepo "github.com/zaengit/page-builder/engine/go/internal/setting/repository"
	settingsvc "github.com/zaengit/page-builder/engine/go/internal/setting/service"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Printf("page-builder-cms %s specification=%d\n", pagebuilder.EngineVersion, pagebuilder.SpecificationVersion)
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
	pr := pagerepo.New(db)
	ps := pagesvc.New(pr)
	bs := blocksvc.New(cfg.BlockRoot)
	mr := mediarepo.New(db)
	ms := mediasvc.New(mr, cfg.StoragePath, cfg.PublicStoragePath, cfg.MaxUploadBytes)
	sr := settingrepo.New(db)
	ss := settingsvc.New(sr)
	dr := datasourcerepo.New(db)
	ds := datasourcesvc.New(dr)
	rh := renderhandler.New(rendersvc.New(ps, bs, pagebuilder.New()))
	h := router.New(router.Dependencies{DB: db, Pages: pagehandler.New(ps), Media: mediahandler.New(ms, cfg.MaxUploadBytes), Blocks: blockhandler.New(bs), Datasources: datasourcehandler.New(ds), Render: rh, Settings: settinghandler.New(ss), CORSOrigins: cfg.CORSOrigins, StorageDir: cfg.StoragePath, PublicStoragePath: cfg.PublicStoragePath})
	srv := &http.Server{Addr: cfg.HTTPAddress, Handler: h, ReadTimeout: cfg.ReadTimeout, ReadHeaderTimeout: cfg.ReadTimeout, WriteTimeout: cfg.WriteTimeout, IdleTimeout: cfg.IdleTimeout}
	errCh := make(chan error, 1)
	go func() {
		slog.Info("Go CMS started", "addr", cfg.HTTPAddress, "database", cfg.DatabaseDriver)
		errCh <- srv.ListenAndServe()
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
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
		os.Exit(6)
	}
	slog.Info("Go CMS stopped")
}
