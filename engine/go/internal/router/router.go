package router

import (
	"context"
	"io"
	"time"

	"github.com/zaengit/page-builder/engine/go/internal/handler"
)

type Router struct {
	handler handler.RenderHandler
	timeout time.Duration
}

func New(handler handler.RenderHandler, timeout time.Duration) Router {
	return Router{handler: handler, timeout: timeout}
}

func (r Router) Serve(input io.Reader, output io.Writer) {
	ctx, cancel := context.WithTimeout(context.Background(), r.timeout)
	defer cancel()
	r.handler.Handle(ctx, input, output)
}
