package middleware

import (
	"fmt"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	"github.com/zaengit/page-builder/engine/go/internal/model"
)

type Error struct {
	Code    string
	Path    string
	Message string
}

func (e Error) Error() string { return e.Message }

type ProtocolMiddleware struct {
	capabilities map[string]bool
}

func NewProtocolMiddleware(capabilities map[string]bool) ProtocolMiddleware {
	return ProtocolMiddleware{capabilities: capabilities}
}

func (m ProtocolMiddleware) Validate(request model.ProtocolRequest) error {
	if request.Version != pagebuilder.ProtocolVersion {
		return Error{Code: "unsupported_protocol_version", Path: "$.version", Message: fmt.Sprintf("unsupported protocol version %d", request.Version)}
	}
	for _, capability := range request.RequiredCapabilities {
		if !m.capabilities[capability] {
			return Error{Code: "unsupported_capability", Path: "$.requiredCapabilities", Message: capability}
		}
	}
	if request.Page == nil {
		return Error{Code: "protocol_invalid_request", Path: "$.page", Message: "page is required"}
	}
	if (request.Registry == nil) == (request.BlockRoot == "") {
		return Error{Code: "protocol_invalid_request", Path: "$", Message: "exactly one of blockRoot or registry is required"}
	}
	return nil
}
