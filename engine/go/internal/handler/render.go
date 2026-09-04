package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	"github.com/zaengit/page-builder/engine/go/internal/middleware"
	"github.com/zaengit/page-builder/engine/go/internal/model"
	"github.com/zaengit/page-builder/engine/go/internal/repository"
	"github.com/zaengit/page-builder/engine/go/internal/service"
)

type RenderHandler struct {
	protocol   middleware.ProtocolMiddleware
	registries repository.RegistryRepository
	renderer   service.RenderService
}

func NewRenderHandler(protocol middleware.ProtocolMiddleware, registries repository.RegistryRepository, renderer service.RenderService) RenderHandler {
	return RenderHandler{protocol: protocol, registries: registries, renderer: renderer}
}

func (h RenderHandler) Handle(ctx context.Context, input io.Reader, output io.Writer) {
	var request model.ProtocolRequest
	decoder := json.NewDecoder(input)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		emit(output, "protocol_invalid_request", "$", err.Error())
		return
	}
	if err := h.protocol.Validate(request); err != nil {
		var protocolError middleware.Error
		if errors.As(err, &protocolError) {
			emit(output, protocolError.Code, protocolError.Path, protocolError.Message)
			return
		}
		emit(output, "protocol_invalid_request", "$", err.Error())
		return
	}

	registry, err := h.registries.Resolve(request.BlockRoot, request.Registry)
	if err != nil {
		path := "$.registry"
		if request.Registry == nil {
			path = "$.blockRoot"
		}
		emit(output, "block_registry_error", path, err.Error())
		return
	}

	result, err := h.renderer.Render(ctx, request.Page, registry, request.Context)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			emit(output, "render_timeout", "$", "renderer deadline exceeded")
		} else {
			emit(output, "render_error", "$", err.Error())
		}
		return
	}
	if err := json.NewEncoder(output).Encode(result); err != nil {
		emit(output, "renderer_process_error", "$", err.Error())
	}
}

func emit(output io.Writer, code, path, message string) {
	p, m := path, message
	_ = json.NewEncoder(output).Encode(pagebuilder.RenderResult{
		Assets:      pagebuilder.Assets{CSS: []string{}, JS: []string{}},
		Diagnostics: []pagebuilder.Diagnostic{{Code: code, Severity: "error", Path: &p, Message: &m}},
	})
}
