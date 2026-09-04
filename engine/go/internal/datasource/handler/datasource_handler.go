package handler

import (
	"encoding/json"
	"net/http"

	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
	datasourcesvc "github.com/zaengit/page-builder/engine/go/internal/datasource/service"
)

type Handler struct{ service *datasourcesvc.Service }

func New(s *datasourcesvc.Service) *Handler { return &Handler{service: s} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.List(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "database_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in datasourcesvc.DefinitionInput
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	item, err := h.service.Register(r.Context(), r.PathValue("name"), in)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "datasource_error", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Metadata(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.Metadata(r.Context(), r.PathValue("resource"))
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "datasource_error", err.Error())
		return
	}
	if item == nil {
		response.Error(w, http.StatusNotFound, "not_found", "datasource not found")
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Query(w http.ResponseWriter, r *http.Request) {
	var in datasourcesvc.Query
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	result, err := h.service.Query(r.Context(), in)
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "datasource_error", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, result)
}
