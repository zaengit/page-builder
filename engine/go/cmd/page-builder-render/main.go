package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
)

type protocolRequest struct {
	Version              int                       `json:"version"`
	Page                 map[string]any            `json:"page"`
	Context              map[string]any            `json:"context"`
	BlockRoot            string                    `json:"blockRoot"`
	Registry             map[string]map[string]any `json:"registry"`
	RequiredCapabilities []string                  `json:"requiredCapabilities"`
}

var capabilities = map[string]bool{
	"portable-blocks":    true,
	"template-v1":        true,
	"responsive-layout":  true,
	"design-tokens":      true,
	"structured-errors":  true,
	"datasource-adapter": true,
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Printf("page-builder-engine-go %s protocol=%d specification=%d\n", pagebuilder.EngineVersion, pagebuilder.ProtocolVersion, pagebuilder.SpecificationVersion)
		return
	}
	var request protocolRequest
	decoder := json.NewDecoder(os.Stdin)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		emit("protocol_invalid_request", "$", err.Error())
		return
	}
	if request.Version != pagebuilder.ProtocolVersion {
		emit("unsupported_protocol_version", "$.version", fmt.Sprintf("unsupported protocol version %d", request.Version))
		return
	}
	for _, capability := range request.RequiredCapabilities {
		if !capabilities[capability] {
			emit("unsupported_capability", "$.requiredCapabilities", capability)
			return
		}
	}
	if request.Page == nil {
		emit("protocol_invalid_request", "$.page", "page is required")
		return
	}
	if (request.Registry == nil) == (request.BlockRoot == "") {
		emit("protocol_invalid_request", "$", "exactly one of blockRoot or registry is required")
		return
	}
	registry := request.Registry
	if registry == nil {
		loaded, err := pagebuilder.LoadRegistry(request.BlockRoot)
		if err != nil {
			emit("block_registry_error", "$.blockRoot", err.Error())
			return
		}
		registry = loaded
	}

	timeout := 5 * time.Second
	if raw := os.Getenv("PAGE_BUILDER_RENDER_TIMEOUT_MS"); raw != "" {
		if ms, err := strconv.Atoi(raw); err == nil && ms > 0 {
			timeout = time.Duration(ms) * time.Millisecond
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	result, err := pagebuilder.New().Render(ctx, pagebuilder.RenderRequest{Page: request.Page, Registry: registry, Context: request.Context})
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			emit("render_timeout", "$", "renderer deadline exceeded")
		} else {
			emit("render_error", "$", err.Error())
		}
		return
	}
	if err := json.NewEncoder(os.Stdout).Encode(result); err != nil {
		emit("renderer_process_error", "$", err.Error())
	}
}

func emit(code, path, message string) {
	p, m := path, message
	_ = json.NewEncoder(os.Stdout).Encode(pagebuilder.RenderResult{
		Assets:      pagebuilder.Assets{CSS: []string{}, JS: []string{}},
		Diagnostics: []pagebuilder.Diagnostic{{Code: code, Severity: "error", Path: &p, Message: &m}},
	})
}
