package handler

import(
	"net/http"
	"strconv"
	mediasvc "github.com/zaengit/page-builder/engine/go/internal/media/service"
	"github.com/zaengit/page-builder/engine/go/internal/pkg/response"
)
type Handler struct{service *mediasvc.Service;max int64}
func New(s *mediasvc.Service,max int64)*Handler{return &Handler{service:s,max:max}}
func(h *Handler)List(w http.ResponseWriter,r *http.Request){v,err:=h.service.List(r.Context());if err!=nil{response.Error(w,500,"database_error",err.Error());return};response.JSON(w,200,v)}
func(h *Handler)Get(w http.ResponseWriter,r *http.Request){id,err:=strconv.ParseUint(r.PathValue("id"),10,64);if err!=nil{response.Error(w,400,"invalid_id","invalid id");return};v,err:=h.service.Get(r.Context(),uint(id));if err!=nil{response.Error(w,404,"not_found","media not found");return};response.JSON(w,200,v)}
func(h *Handler)Upload(w http.ResponseWriter,r *http.Request){r.Body=http.MaxBytesReader(w,r.Body,h.max+(1<<20));if err:=r.ParseMultipartForm(h.max);err!=nil{response.Error(w,413,"upload_too_large",err.Error());return};f,hdr,err:=r.FormFile("file");if err!=nil{response.Error(w,400,"invalid_upload",err.Error());return};defer f.Close();m,err:=h.service.Save(r.Context(),hdr.Filename,hdr.Header.Get("Content-Type"),f,hdr.Size);if err!=nil{response.Error(w,422,"invalid_upload",err.Error());return};response.JSON(w,201,m)}
func(h *Handler)Delete(w http.ResponseWriter,r *http.Request){id,err:=strconv.ParseUint(r.PathValue("id"),10,64);if err!=nil{response.Error(w,400,"invalid_id","invalid id");return};if err:=h.service.Delete(r.Context(),uint(id));err!=nil{response.Error(w,500,"delete_failed",err.Error());return};w.WriteHeader(204)}
