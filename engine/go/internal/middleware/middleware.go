package middleware

import(
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"
)
type Middleware func(http.Handler) http.Handler
func Chain(h http.Handler,m ...Middleware)http.Handler{for i:=len(m)-1;i>=0;i--{h=m[i](h)};return h}
func Recover(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){defer func(){if v:=recover();v!=nil{slog.Error("panic","error",v,"stack",string(debug.Stack()));http.Error(w,"internal server error",500)}}();next.ServeHTTP(w,r)})}
func Security(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.Header().Set("X-Content-Type-Options","nosniff");w.Header().Set("X-Frame-Options","SAMEORIGIN");w.Header().Set("Referrer-Policy","strict-origin-when-cross-origin");next.ServeHTTP(w,r)})}
func Logger(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){start:=time.Now();next.ServeHTTP(w,r);slog.Info("http request","method",r.Method,"path",r.URL.Path,"duration_ms",time.Since(start).Milliseconds())})}
func CORS(origins []string)Middleware{return func(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){origin:=r.Header.Get("Origin");allowed:=origin=="";for _,v:=range origins{if v=="*"||strings.EqualFold(v,origin){allowed=true;break}};if allowed&&origin!=""{w.Header().Set("Access-Control-Allow-Origin",origin);w.Header().Set("Vary","Origin");w.Header().Set("Access-Control-Allow-Headers","Content-Type, Authorization");w.Header().Set("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS")};if r.Method==http.MethodOptions{if !allowed{http.Error(w,"origin not allowed",403);return};w.WriteHeader(204);return};if !allowed{http.Error(w,"origin not allowed",403);return};next.ServeHTTP(w,r)})}}
