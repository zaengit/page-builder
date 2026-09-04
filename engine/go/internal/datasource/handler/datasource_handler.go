package handler

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	datasourcesvc "github.com/zaengit/page-builder/engine/go/internal/datasource/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
)

type Handler struct{ service *datasourcesvc.Service }

func New(s *datasourcesvc.Service) *Handler { return &Handler{service: s} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.List(r.Context())
	if err != nil {
		slog.Error("datasource list failed", "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in datasourcesvc.DefinitionInput
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", "invalid datasource definition")
		return
	}
	item, err := h.service.Register(r.Context(), r.PathValue("name"), in)
	if err != nil {
		slog.Warn("datasource registration rejected", "name", r.PathValue("name"), "error", err)
		response.Error(w, http.StatusUnprocessableEntity, "datasource_error", "invalid datasource definition")
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Metadata(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.Metadata(r.Context(), r.PathValue("resource"))
	if err != nil {
		slog.Error("datasource metadata failed", "resource", r.PathValue("resource"), "error", err)
		response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	if item == nil {
		response.Error(w, http.StatusNotFound, "not_found", "datasource not found")
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Query(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	if err := dec.Decode(&raw); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", "invalid datasource request")
		return
	}

	var shape map[string]json.RawMessage
	if err := json.Unmarshal(raw, &shape); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", "invalid datasource request")
		return
	}

	if _, canonical := shape["provider"]; canonical {
		var request pagebuilder.DatasourceRequest
		if err := strictJSON(raw, &request); err != nil {
			response.Error(w, http.StatusBadRequest, "invalid_request", "invalid canonical datasource request")
			return
		}
		result, err := h.service.Resolve(r.Context(), request, nil)
		if err != nil {
			slog.Warn("datasource resolve rejected", "resource", request.Resource, "error", err)
			response.Error(w, http.StatusUnprocessableEntity, "datasource_error", "datasource request could not be resolved")
			return
		}
		response.JSON(w, http.StatusOK, result)
		return
	}

	var legacy datasourcesvc.Query
	if err := strictJSON(raw, &legacy); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_request", "invalid datasource request")
		return
	}
	result, err := h.service.Query(r.Context(), legacy)
	if err != nil {
		slog.Warn("datasource query rejected", "resource", legacy.Resource, "error", err)
		response.Error(w, http.StatusUnprocessableEntity, "datasource_error", "datasource request could not be resolved")
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func strictJSON(raw []byte, dst any) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
