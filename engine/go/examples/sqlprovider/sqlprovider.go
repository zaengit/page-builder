package sqlprovider

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"sort"
	"strings"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
)

type Resource struct {
	Table   string
	Columns map[string]string
}

type Adapter struct {
	DB        *sql.DB
	Resources map[string]Resource
	MaxRows   int
}

var identifier = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

func (a Adapter) Resolve(ctx context.Context, request pagebuilder.DatasourceRequest, runtime map[string]any) (any, error) {
	resource, ok := a.Resources[request.Resource]
	if !ok || !identifier.MatchString(resource.Table) {
		return nil, fmt.Errorf("unknown resource %q", request.Resource)
	}
	keys := make([]string, 0, len(resource.Columns))
	for key := range resource.Columns {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	columns := make([]string, 0, len(keys))
	for _, key := range keys {
		column := resource.Columns[key]
		if !identifier.MatchString(column) {
			return nil, fmt.Errorf("unsafe configured column %q", column)
		}
		columns = append(columns, column)
	}
	if len(columns) == 0 {
		return nil, fmt.Errorf("resource %q has no exposed columns", request.Resource)
	}
	query := "SELECT " + strings.Join(columns, ",") + " FROM " + resource.Table
	args := []any{}
	clauses := []string{}
	for _, filter := range request.Query.Where {
		column, ok := resource.Columns[filter.Column]
		if !ok {
			return nil, fmt.Errorf("column %q is not exposed", filter.Column)
		}
		op := strings.ToLower(filter.Operator)
		if op != "=" && op != "!=" && op != ">" && op != ">=" && op != "<" && op != "<=" && op != "like" {
			return nil, fmt.Errorf("operator %q is not supported by this example", filter.Operator)
		}
		clauses = append(clauses, column+" "+op+" ?")
		args = append(args, filter.Value)
	}
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	if len(request.Query.OrderBy) > 0 {
		parts := []string{}
		for _, order := range request.Query.OrderBy {
			column, ok := resource.Columns[order.Column]
			if !ok {
				return nil, fmt.Errorf("column %q is not exposed", order.Column)
			}
			direction := "ASC"
			if strings.EqualFold(order.Direction, "desc") {
				direction = "DESC"
			}
			parts = append(parts, column+" "+direction)
		}
		query += " ORDER BY " + strings.Join(parts, ",")
	}
	maxRows := a.MaxRows
	if maxRows <= 0 {
		maxRows = 100
	}
	limit := request.Query.Limit
	if limit <= 0 || limit > maxRows {
		limit = maxRows
	}
	query += " LIMIT ? OFFSET ?"
	args = append(args, limit, request.Query.Offset)

	rows, err := a.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []map[string]any{}
	columnNames, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		values := make([]any, len(columnNames))
		pointers := make([]any, len(columnNames))
		for i := range values {
			pointers[i] = &values[i]
		}
		if err := rows.Scan(pointers...); err != nil {
			return nil, err
		}
		item := map[string]any{}
		for i, name := range columnNames {
			item[name] = values[i]
		}
		result = append(result, item)
		if request.Mode != "collection" {
			return item, nil
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if request.Mode != "collection" {
		return nil, nil
	}
	return pagebuilder.DatasourceCollectionResult{Items: result}, nil
}
