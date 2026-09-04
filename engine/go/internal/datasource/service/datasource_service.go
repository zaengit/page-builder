package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"

	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	datasourcerepo "github.com/zaengit/page-builder/engine/go/internal/datasource/repository"
	pagebuilder "github.com/zaengit/page-builder/engine/go/internal/render/engine"
	"gorm.io/gorm"
)

var identifierRE = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
var resourceRE = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]*$`)

type ResourceConfig struct {
	Table      string   `json:"table"`
	PrimaryKey string   `json:"primaryKey"`
	Columns    []string `json:"columns"`
}

type DefinitionInput struct {
	Resource string         `json:"resource"`
	Config   ResourceConfig `json:"config"`
}

type Filter struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value any    `json:"value"`
}

type Order struct {
	Field     string `json:"field"`
	Direction string `json:"direction"`
}

type Query struct {
	Resource  string   `json:"resource"`
	Filters   []Filter `json:"filters"`
	OrderBy   string   `json:"orderBy"`
	Direction string   `json:"direction"`
	Orders    []Order  `json:"orders,omitempty"`
	Limit     int      `json:"limit"`
	Offset    int      `json:"offset"`
}

type Result struct {
	Items  []map[string]any `json:"items"`
	Total  int64            `json:"total"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}

type Service struct{ repo *datasourcerepo.Repository }

func New(repo *datasourcerepo.Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context) ([]datasourcemodel.Datasource, error) {
	return s.repo.List(ctx)
}

func (s *Service) Register(ctx context.Context, name string, in DefinitionInput) (*datasourcemodel.Datasource, error) {
	name = strings.TrimSpace(name)
	in.Resource = strings.TrimSpace(in.Resource)
	if name == "" {
		return nil, errors.New("datasource name is required")
	}
	if !resourceRE.MatchString(in.Resource) {
		return nil, errors.New("invalid datasource resource")
	}
	cfg, err := normalizeConfig(in.Config)
	if err != nil {
		return nil, err
	}
	raw, err := json.Marshal(cfg)
	if err != nil {
		return nil, err
	}
	item := &datasourcemodel.Datasource{Name: name, Resource: in.Resource, Config: raw}
	if err := s.repo.Upsert(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Service) Metadata(ctx context.Context, resource string) (map[string]any, error) {
	d, err := s.repo.ByResource(ctx, resource)
	if err != nil {
		return nil, err
	}
	if d == nil {
		return nil, nil
	}
	cfg, err := parseConfig(d)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"name": d.Name, "resource": d.Resource, "columns": cfg.Columns, "primaryKey": cfg.PrimaryKey,
	}, nil
}

func (s *Service) Resolve(ctx context.Context, request pagebuilder.DatasourceRequest, runtime map[string]any) (any, error) {
	if request.Provider != "database" && request.Provider != "sql" {
		return nil, fmt.Errorf("unsupported datasource provider %q", request.Provider)
	}
	mode := request.Mode
	if mode == "" {
		mode = "single"
	}
	if mode != "single" && mode != "collection" {
		return nil, fmt.Errorf("unsupported datasource mode %q", mode)
	}
	if len(request.Query.With) > 0 {
		return nil, errors.New("relations/includes require an application-specific datasource adapter")
	}

	_, cfg, allowed, err := s.resource(ctx, request.Resource)
	if err != nil {
		return nil, err
	}
	q := s.repo.DB().WithContext(ctx).Table(cfg.Table).Select(cfg.Columns)

	recordID := request.RecordID
	if recordID == nil && request.ContextKey != "" {
		recordID = resolveRuntime(runtime, request.ContextKey)
	}
	if recordID != nil {
		q = q.Where(cfg.PrimaryKey+" = ?", recordID)
	}
	q, err = applyCanonicalFilters(q, request.Query.Where, allowed)
	if err != nil {
		return nil, err
	}
	q, err = applyCanonicalOrders(q, request.Query.OrderBy, allowed)
	if err != nil {
		return nil, err
	}

	if mode == "single" {
		var row map[string]any
		err := q.Limit(1).Take(&row).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		return row, nil
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, err
	}

	limit := request.Query.Limit
	offset := request.Query.Offset
	var pagination *pagebuilder.DatasourcePagination
	if request.Query.PerPage > 0 {
		perPage := request.Query.PerPage
		if perPage > 100 {
			perPage = 100
		}
		page := request.Query.Page
		if page <= 0 {
			page = 1
		}
		limit = perPage
		offset = (page - 1) * perPage
		lastPage := int(math.Ceil(float64(total) / float64(perPage)))
		if lastPage < 1 {
			lastPage = 1
		}
		pagination = &pagebuilder.DatasourcePagination{
			CurrentPage:  page,
			PerPage:      perPage,
			LastPage:     lastPage,
			Total:        int(total),
			HasMorePages: page < lastPage,
		}
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows := []map[string]any{}
	if err := q.Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, err
	}
	return pagebuilder.DatasourceCollectionResult{Items: rows, Pagination: pagination}, nil
}

func (s *Service) Query(ctx context.Context, in Query) (Result, error) {
	_, cfg, allowed, err := s.resource(ctx, strings.TrimSpace(in.Resource))
	if err != nil {
		return Result{}, err
	}
	q := s.repo.DB().WithContext(ctx).Table(cfg.Table).Select(cfg.Columns)
	for _, f := range in.Filters {
		q, err = applyFilter(q, f.Field, f.Op, f.Value, allowed)
		if err != nil {
			return Result{}, err
		}
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return Result{}, err
	}
	if in.Limit <= 0 || in.Limit > 100 {
		in.Limit = 20
	}
	if in.Offset < 0 {
		in.Offset = 0
	}
	orders := in.Orders
	if in.OrderBy != "" {
		orders = append(orders, Order{Field: in.OrderBy, Direction: in.Direction})
	}
	for _, order := range orders {
		if !allowed[order.Field] {
			return Result{}, fmt.Errorf("order field %q is not allowed", order.Field)
		}
		direction := strings.ToUpper(strings.TrimSpace(order.Direction))
		if direction != "DESC" {
			direction = "ASC"
		}
		q = q.Order(order.Field + " " + direction)
	}
	rows := []map[string]any{}
	if err := q.Limit(in.Limit).Offset(in.Offset).Find(&rows).Error; err != nil {
		return Result{}, err
	}
	return Result{Items: rows, Total: total, Limit: in.Limit, Offset: in.Offset}, nil
}

func (s *Service) resource(ctx context.Context, resource string) (*datasourcemodel.Datasource, ResourceConfig, map[string]bool, error) {
	d, err := s.repo.ByResource(ctx, strings.TrimSpace(resource))
	if err != nil {
		return nil, ResourceConfig{}, nil, err
	}
	if d == nil {
		return nil, ResourceConfig{}, nil, errors.New("datasource resource not found")
	}
	cfg, err := parseConfig(d)
	if err != nil {
		return nil, ResourceConfig{}, nil, err
	}
	allowed := make(map[string]bool, len(cfg.Columns))
	for _, column := range cfg.Columns {
		allowed[column] = true
	}
	return d, cfg, allowed, nil
}

func applyCanonicalFilters(q *gorm.DB, filters []pagebuilder.DatasourceFilter, allowed map[string]bool) (*gorm.DB, error) {
	var err error
	for _, filter := range filters {
		q, err = applyFilter(q, filter.Column, filter.Operator, filter.Value, allowed)
		if err != nil {
			return nil, err
		}
	}
	return q, nil
}

func applyCanonicalOrders(q *gorm.DB, orders []pagebuilder.DatasourceOrder, allowed map[string]bool) (*gorm.DB, error) {
	for _, order := range orders {
		if !allowed[order.Column] {
			return nil, fmt.Errorf("order field %q is not allowed", order.Column)
		}
		direction := strings.ToUpper(strings.TrimSpace(order.Direction))
		if direction == "" {
			direction = "ASC"
		}
		if direction != "ASC" && direction != "DESC" {
			return nil, fmt.Errorf("invalid order direction %q", order.Direction)
		}
		q = q.Order(order.Column + " " + direction)
	}
	return q, nil
}

func applyFilter(q *gorm.DB, field, operator string, value any, allowed map[string]bool) (*gorm.DB, error) {
	if !allowed[field] {
		return nil, fmt.Errorf("field %q is not allowed", field)
	}
	switch strings.ToLower(strings.TrimSpace(operator)) {
	case "eq", "=":
		return q.Where(field+" = ?", value), nil
	case "neq", "!=", "<>":
		return q.Where(field+" <> ?", value), nil
	case "gt", ">":
		return q.Where(field+" > ?", value), nil
	case "gte", ">=":
		return q.Where(field+" >= ?", value), nil
	case "lt", "<":
		return q.Where(field+" < ?", value), nil
	case "lte", "<=":
		return q.Where(field+" <= ?", value), nil
	case "like":
		return q.Where(field+" LIKE ?", value), nil
	case "not like":
		return q.Where(field+" NOT LIKE ?", value), nil
	case "in":
		return q.Where(field+" IN ?", value), nil
	case "not in":
		return q.Where(field+" NOT IN ?", value), nil
	case "null":
		return q.Where(field + " IS NULL"), nil
	case "not null":
		return q.Where(field + " IS NOT NULL"), nil
	default:
		return nil, fmt.Errorf("operator %q is not allowed", operator)
	}
}

func resolveRuntime(runtime map[string]any, path string) any {
	var current any = runtime
	for _, part := range strings.Split(path, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current, ok = object[part]
		if !ok {
			return nil
		}
	}
	return current
}

func parseConfig(d *datasourcemodel.Datasource) (ResourceConfig, error) {
	var cfg ResourceConfig
	if err := json.Unmarshal(d.Config, &cfg); err != nil {
		return cfg, err
	}
	return normalizeConfig(cfg)
}

func normalizeConfig(cfg ResourceConfig) (ResourceConfig, error) {
	cfg.Table = strings.TrimSpace(cfg.Table)
	cfg.PrimaryKey = strings.TrimSpace(cfg.PrimaryKey)
	if !identifierRE.MatchString(cfg.Table) {
		return cfg, errors.New("invalid datasource table")
	}
	if cfg.PrimaryKey == "" {
		cfg.PrimaryKey = "id"
	}
	if !identifierRE.MatchString(cfg.PrimaryKey) {
		return cfg, errors.New("invalid primary key")
	}
	if len(cfg.Columns) == 0 {
		return cfg, errors.New("datasource columns cannot be empty")
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(cfg.Columns))
	for _, c := range cfg.Columns {
		c = strings.TrimSpace(c)
		if !identifierRE.MatchString(c) {
			return cfg, fmt.Errorf("invalid column %q", c)
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	cfg.Columns = out
	sort.Strings(cfg.Columns)
	return cfg, nil
}
