package middleware

import (
	"fmt"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	"github.com/zaengit/page-builder/engine/go/internal/model"
)

type ProtocolMiddleware struct {
	capabilities map[string]bool
}

func NewProtocolMiddleware(capabilities map[string]bool) ProtocolMiddleware {
	return ProtocolMiddleware{capabilities: capabilities}
}

func (m ProtocolMiddleware) Validate(request model.ProtocolRequest) error {
	if request.Version != pagebuilder.ProtocolVersion {
		return fmt.Errorf("unsupported protocol version %d", request.Version)
	}
	for _, capability := range request.RequiredCapabilities {
		if !m.capabilities[capability] {
			return fmt.Errorf("unsupported capability %s", capability)
		}
	}
	if request.Page == nil {
		return fmt.Errorf("page is required")
	}
	if (request.Registry == nil) == (request.BlockRoot == "") {
		return fmt.Errorf("exactly one of blockRoot or registry is required")
	}
	return nil
}
