package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	settingsvc "github.com/zaengit/page-builder/engine/go/internal/setting/service"
)

type Handler struct{ service *settingsvc.Service }

func New(s *settingsvc.Service) *Handler { return &Handler{service: s} }

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	value, err := h.service.Get(r.Context())
	if err != nil {
		slog.Error("settings read failed", "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	var out any
	if err := json.Unmarshal(value, &out); err != nil {
		slog.Error("stored settings JSON is invalid", "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	var value json.RawMessage
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	if err := dec.Decode(&value); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", "invalid JSON body")
		return
	}
	saved, err := h.service.Put(r.Context(), value)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "validation_error", "invalid settings document")
		return
	}
	var out any
	if err := json.Unmarshal(saved, &out); err != nil {
		slog.Error("saved settings JSON is invalid", "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, out)
}
