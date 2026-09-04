package main

import (
	"fmt"
	"os"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	"github.com/zaengit/page-builder/engine/go/internal/config"
	"github.com/zaengit/page-builder/engine/go/internal/handler"
	"github.com/zaengit/page-builder/engine/go/internal/middleware"
	"github.com/zaengit/page-builder/engine/go/internal/repository"
	"github.com/zaengit/page-builder/engine/go/internal/router"
	"github.com/zaengit/page-builder/engine/go/internal/service"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Printf("page-builder-engine-go %s protocol=%d specification=%d\n", pagebuilder.EngineVersion, pagebuilder.ProtocolVersion, pagebuilder.SpecificationVersion)
		return
	}

	cfg := config.Load()
	protocol := middleware.NewProtocolMiddleware(cfg.Capabilities)
	registries := repository.NewRegistryRepository()
	renderer := service.NewRenderService(pagebuilder.New())
	renderHandler := handler.NewRenderHandler(protocol, registries, renderer)
	app := router.New(renderHandler, cfg.RenderTimeout)
	app.Serve(os.Stdin, os.Stdout)
}
