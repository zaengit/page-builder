package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"

	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	datasourcerepo "github.com/zaengit/page-builder/engine/go/internal/datasource/repository"
)

var identifierRE = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type ResourceConfig struct {
	Table      string   `json:"table"`
	PrimaryKey string   `json:"primaryKey"`
	Columns    []string `json:"columns"`
}

type Filter struct { Field string `json:"field"`; Op string `json:"op"`; Value any `json:"value"` }
type Query struct { Resource string `json:"resource"`; Filters []Filter `json:"filters"`; OrderBy string `json:"orderBy"`; Direction string `json:"direction"`; Limit int `json:"limit"`; Offset int `json:"offset"` }
type Result struct { Items []map[string]any `json:"items"`; Total int64 `json:"total"`; Limit int `json:"limit"`; Offset int `json:"offset"` }

type Service struct{ repo *datasourcerepo.Repository }
func New(repo *datasourcerepo.Repository) *Service { return &Service{repo:repo} }
func (s *Service) List(ctx context.Context)([]datasourcemodel.Datasource,error){ return s.repo.List(ctx) }
func (s *Service) Metadata(ctx context.Context, resource string)(map[string]any,error){ d,err:=s.repo.ByResource(ctx,resource);if err!=nil{return nil,err};if d==nil{return nil,nil};cfg,err:=parseConfig(d);if err!=nil{return nil,err};return map[string]any{"name":d.Name,"resource":d.Resource,"columns":cfg.Columns,"primaryKey":cfg.PrimaryKey},nil }
func (s *Service) Query(ctx context.Context, in Query)(Result,error){d,err:=s.repo.ByResource(ctx,in.Resource);if err!=nil{return Result{},err};if d==nil{return Result{},errors.New("datasource resource not found")};cfg,err:=parseConfig(d);if err!=nil{return Result{},err};allowed:=map[string]bool{};for _,c:=range cfg.Columns{allowed[c]=true};q:=s.repo.DB().WithContext(ctx).Table(cfg.Table).Select(cfg.Columns);for _,f:=range in.Filters{if !allowed[f.Field]{return Result{},fmt.Errorf("field %q is not allowed",f.Field)};op:=strings.ToLower(strings.TrimSpace(f.Op));switch op{case "eq","=":q=q.Where(f.Field+" = ?",f.Value);case "neq","!=":q=q.Where(f.Field+" <> ?",f.Value);case "gt":q=q.Where(f.Field+" > ?",f.Value);case "gte":q=q.Where(f.Field+" >= ?",f.Value);case "lt":q=q.Where(f.Field+" < ?",f.Value);case "lte":q=q.Where(f.Field+" <= ?",f.Value);case "like":q=q.Where(f.Field+" LIKE ?",f.Value);default:return Result{},fmt.Errorf("operator %q is not allowed",f.Op)}};var total int64;if err:=q.Count(&total).Error;err!=nil{return Result{},err};if in.Limit<=0||in.Limit>100{in.Limit=20};if in.Offset<0{in.Offset=0};if in.OrderBy!=""{if !allowed[in.OrderBy]{return Result{},fmt.Errorf("order field %q is not allowed",in.OrderBy)};dir:=strings.ToUpper(in.Direction);if dir!="DESC"{dir="ASC"};q=q.Order(in.OrderBy+" "+dir)};var rows []map[string]any;if err:=q.Limit(in.Limit).Offset(in.Offset).Find(&rows).Error;err!=nil{return Result{},err};return Result{Items:rows,Total:total,Limit:in.Limit,Offset:in.Offset},nil}
func parseConfig(d *datasourcemodel.Datasource)(ResourceConfig,error){var cfg ResourceConfig;if err:=json.Unmarshal(d.Config,&cfg);err!=nil{return cfg,err};if !identifierRE.MatchString(cfg.Table){return cfg,errors.New("invalid datasource table")};if cfg.PrimaryKey==""{cfg.PrimaryKey="id"};if !identifierRE.MatchString(cfg.PrimaryKey){return cfg,errors.New("invalid primary key")};if len(cfg.Columns)==0{return cfg,errors.New("datasource columns cannot be empty")};seen:=map[string]bool{};out:=cfg.Columns[:0];for _,c:=range cfg.Columns{if !identifierRE.MatchString(c){return cfg,fmt.Errorf("invalid column %q",c)};if !seen[c]{seen[c]=true;out=append(out,c)}};cfg.Columns=out;sort.Strings(cfg.Columns);return cfg,nil}
