package handler

import (
	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	"net/http"
)

type Handler struct{ service *blocksvc.Service }

func New(s *blocksvc.Service) *Handler { return &Handler{service: s} }
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	v, err := h.service.List(r.Context())
	if err != nil {
		response.Error(w, 500, "block_registry_error", err.Error())
		return
	}
	response.JSON(w, 200, v)
}
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	v, err := h.service.Get(r.Context(), r.PathValue("type"))
	if err != nil {
		response.Error(w, 404, "not_found", err.Error())
		return
	}
	response.JSON(w, 200, v)
}
