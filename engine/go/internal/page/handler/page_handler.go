package handler

import (
	"encoding/json"
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
		response.Error(w, 400, "invalid_request", err.Error())
		return false
	}
	return true
}
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := h.service.List(r.Context(), limit, offset, r.URL.Query().Get("status"))
	if err != nil {
		response.Error(w, 500, "database_error", err.Error())
		return
	}
	response.WithMeta(w, 200, items, map[string]any{"total": total, "limit": limit, "offset": offset})
}
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in createRequest
	if !decode(w, r, &in) {
		return
	}
	p, err := h.service.Create(r.Context(), in.Title, in.Slug, in.Content)
	if err != nil {
		response.Error(w, 422, "validation_error", err.Error())
		return
	}
	response.JSON(w, 201, p)
}
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, 400, "invalid_id", "invalid id")
		return
	}
	p, err := h.service.Get(r.Context(), i)
	if err != nil {
		response.Error(w, 500, "database_error", err.Error())
		return
	}
	if p == nil {
		response.Error(w, 404, "not_found", "page not found")
		return
	}
	response.JSON(w, 200, p)
}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, 400, "invalid_id", "invalid id")
		return
	}
	var in updateRequest
	if !decode(w, r, &in) {
		return
	}
	p, err := h.service.Update(r.Context(), i, in.Title, in.Slug, in.Content)
	if err != nil {
		response.Error(w, 422, "validation_error", err.Error())
		return
	}
	if p == nil {
		response.Error(w, 404, "not_found", "page not found")
		return
	}
	response.JSON(w, 200, p)
}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	i, err := id(r)
	if err != nil {
		response.Error(w, 400, "invalid_id", "invalid id")
		return
	}
	if err := h.service.Delete(r.Context(), i); err != nil {
		response.Error(w, 500, "database_error", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h *Handler) Publish(w http.ResponseWriter, r *http.Request)   { h.setPublish(w, r, true) }
func (h *Handler) Unpublish(w http.ResponseWriter, r *http.Request) { h.setPublish(w, r, false) }
func (h *Handler) setPublish(w http.ResponseWriter, r *http.Request, v bool) {
	i, err := id(r)
	if err != nil {
		response.Error(w, 400, "invalid_id", "invalid id")
		return
	}
	p, err := h.service.Publish(r.Context(), i, v)
	if err != nil {
		response.Error(w, 500, "database_error", err.Error())
		return
	}
	if p == nil {
		response.Error(w, 404, "not_found", "page not found")
		return
	}
	response.JSON(w, 200, p)
}
