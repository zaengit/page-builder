package handler

import (
	"encoding/json"
	"net/http"

	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	rendermodel "github.com/zaengit/page-builder/engine/go/internal/render/model"
	rendersvc "github.com/zaengit/page-builder/engine/go/internal/render/service"
)

type Handler struct {
	service *rendersvc.Service
}

func New(s *rendersvc.Service) *Handler {
	return &Handler{service: s}
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return false
	}
	return true
}

func (h *Handler) Preview(w http.ResponseWriter, r *http.Request) {
	var in rendermodel.PagePreviewRequest
	if !decode(w, r, &in) {
		return
	}
	out, err := h.service.Preview(r.Context(), in.Page, in.Context)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "render_error", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *Handler) BlockPreview(w http.ResponseWriter, r *http.Request) {
	var in rendermodel.BlockPreviewRequest
	if !decode(w, r, &in) {
		return
	}
	out, err := h.service.BlockPreview(r.Context(), in.Block, in.Context)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "render_error", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *Handler) Frontend(w http.ResponseWriter, r *http.Request) {
	out, err := h.service.Published(r.Context(), r.PathValue("slug"), nil)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(out.HTML))
}
