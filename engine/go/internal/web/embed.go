package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed static
var embedded embed.FS

type Handler struct {
	fs http.Handler
	fsys fs.FS
}

func New() *Handler {
	sub, err := fs.Sub(embedded, "static")
	if err != nil {
		panic(err)
	}
	return &Handler{fs: http.FileServer(http.FS(sub)), fsys: sub}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name == "." || name == "" {
		name = "index.html"
	}
	if info, err := fs.Stat(h.fsys, name); err == nil && !info.IsDir() {
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/" + name
		h.fs.ServeHTTP(w, r2)
		return
	}

	// React editor routes use a SPA fallback while API/media/frontend routes
	// stay outside this handler under the CMS router.
	r2 := r.Clone(r.Context())
	r2.URL.Path = "/index.html"
	h.fs.ServeHTTP(w, r2)
}
