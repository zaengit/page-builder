package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	pagesvc "github.com/zaengit/page-builder/engine/go/internal/page/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
)

type Handler struct{ service *pagesvc.Service }

func New(s *pagesvc.Service) *Handler { return &Handler{service: s} }

type createRequest struct {
	Title   string          `json:"title"`
	Slug    string          `json:"slug"`
	Content json.RawMessage `json:"content"`
}

type updateRequest struct {
	Title   *string          `json:"title"`
	Slug    *string          `json:"slug"`
	Content *json.RawMessage `json:"content"`
}

func id(r *http.Request) (uint, error) {
	n, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	return uint(n), err
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

func writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var validation pagesvc.ValidationError
	if errors.As(err, &validation) {
		response.Error(w, http.StatusUnprocessableEntity, "validation_error", validation.Error())
		return
	}
	slog.Error("page operation failed", "method", r.Method, "path", r.URL.Path, "error", err)
	response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error")
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	options := pagesvc.ListOptions{
		Limit:     limit,
		Offset:    offset,
		Status:    r.URL.Query().Get("status"),
		Search:    r.URL.Query().Get("q"),
		OrderBy:   r.URL.Query().Get("order"),
		Direction: r.URL.Query().Get("direction"),
	}
	items, total, err := h.service.List(r.Context(), options)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	response.WithMeta(w, http.StatusOK, items, map[string]any{
		"total":  total,
		"limit":  options.Limit,
		"offset": options.Offset,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in createRequest
	if !decode(w, r, &in) {
		return
	}
	p, err := h.service.Create(r.Context(), in.Title, in.Slug, in.Content)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	response.JSON(w, http.StatusCreated, p)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	p, err := h.service.Get(r.Context(), i)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	if p == nil {
		response.Error(w, http.StatusNotFound, "not_found", "page not found")
		return
	}
	response.JSON(w, http.StatusOK, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	var in updateRequest
	if !decode(w, r, &in) {
		return
	}
	p, err := h.service.Update(r.Context(), i, in.Title, in.Slug, in.Content)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	if p == nil {
		response.Error(w, http.StatusNotFound, "not_found", "page not found")
		return
	}
	response.JSON(w, http.StatusOK, p)
}

func (h *Handler) Duplicate(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	p, err := h.service.Duplicate(r.Context(), i)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	if p == nil {
		response.Error(w, http.StatusNotFound, "not_found", "page not found")
		return
	}
	response.JSON(w, http.StatusCreated, p)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	if err := h.service.Delete(r.Context(), i); err != nil {
		writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Publish(w http.ResponseWriter, r *http.Request) { h.setPublish(w, r, true) }
func (h *Handler) Unpublish(w http.ResponseWriter, r *http.Request) { h.setPublish(w, r, false) }

func (h *Handler) setPublish(w http.ResponseWriter, r *http.Request, published bool) {
	i, err := id(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	p, err := h.service.Publish(r.Context(), i, published)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	if p == nil {
		response.Error(w, http.StatusNotFound, "not_found", "page not found")
		return
	}
	response.JSON(w, http.StatusOK, p)
}
