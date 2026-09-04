package handler

import (
	"log/slog"
	"net/http"

	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
)

type Handler struct{ service *blocksvc.Service }

func New(s *blocksvc.Service) *Handler { return &Handler{service: s} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	definitions, err := h.service.List(r.Context())
	if err != nil {
		slog.Error("block registry list failed", "error", err)
		response.Error(w, http.StatusInternalServerError, "block_registry_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, definitions)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	definition, err := h.service.Get(r.Context(), r.PathValue("type"))
	if err != nil {
		response.Error(w, http.StatusNotFound, "not_found", "block not found")
		return
	}
	response.JSON(w, http.StatusOK, definition)
}
