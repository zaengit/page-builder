package handler

import (
	"encoding/json"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	settingsvc "github.com/zaengit/page-builder/engine/go/internal/setting/service"
	"net/http"
)

type Handler struct{ service *settingsvc.Service }

func New(s *settingsvc.Service) *Handler { return &Handler{service: s} }
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	v, err := h.service.Get(r.Context())
	if err != nil {
		response.Error(w, 500, "database_error", err.Error())
		return
	}
	var out any
	_ = json.Unmarshal(v, &out)
	response.JSON(w, 200, out)
}
func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	var v json.RawMessage
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	if err := dec.Decode(&v); err != nil {
		response.Error(w, 400, "invalid_request", err.Error())
		return
	}
	saved, err := h.service.Put(r.Context(), v)
	if err != nil {
		response.Error(w, 422, "validation_error", err.Error())
		return
	}
	var out any
	_ = json.Unmarshal(saved, &out)
	response.JSON(w, 200, out)
}
