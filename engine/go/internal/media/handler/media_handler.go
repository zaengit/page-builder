package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	mediasvc "github.com/zaengit/page-builder/engine/go/internal/media/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
)

type Handler struct {
	service *mediasvc.Service
	max     int64
}

func New(s *mediasvc.Service, max int64) *Handler { return &Handler{service: s, max: max} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.List(r.Context())
	if err != nil {
		slog.Error("media list failed", "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	item, err := h.service.Get(r.Context(), uint(id))
	if errors.Is(err, mediasvc.ErrNotFound) {
		response.Error(w, http.StatusNotFound, "not_found", "media not found")
		return
	}
	if err != nil {
		slog.Error("media get failed", "error", err, "id", id)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, h.max+(1<<20))
	if err := r.ParseMultipartForm(h.max); err != nil {
		response.Error(w, http.StatusRequestEntityTooLarge, "upload_too_large", "upload exceeds configured size limit")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_upload", "file is required")
		return
	}
	defer file.Close()

	item, err := h.service.Save(r.Context(), header.Filename, header.Header.Get("Content-Type"), file, header.Size)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "invalid_upload", err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	if err := h.service.Delete(r.Context(), uint(id)); errors.Is(err, mediasvc.ErrNotFound) {
		response.Error(w, http.StatusNotFound, "not_found", "media not found")
		return
	} else if err != nil {
		slog.Error("media delete failed", "error", err, "id", id)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
