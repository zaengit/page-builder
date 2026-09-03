package pagebuilder

import "context"

type DatasourceFilter struct {
	Column   string `json:"column"`
	Operator string `json:"operator"`
	Value    any    `json:"value,omitempty"`
}

type DatasourceOrder struct {
	Column    string `json:"column"`
	Direction string `json:"direction,omitempty"`
}

type DatasourceQuery struct {
	Where   []DatasourceFilter `json:"where,omitempty"`
	OrderBy []DatasourceOrder  `json:"orderBy,omitempty"`
	With    []string           `json:"with,omitempty"`
	Limit   int                `json:"limit,omitempty"`
	Offset  int                `json:"offset,omitempty"`
	PerPage int                `json:"perPage,omitempty"`
	Page    int                `json:"page,omitempty"`
}

type DatasourceRequest struct {
	Provider   string          `json:"provider"`
	Resource   string          `json:"resource"`
	Mode       string          `json:"mode,omitempty"`
	RecordID   any             `json:"recordId,omitempty"`
	ContextKey string          `json:"contextKey,omitempty"`
	Query      DatasourceQuery `json:"query,omitempty"`
}

type DatasourcePagination struct {
	CurrentPage  int  `json:"currentPage"`
	PerPage      int  `json:"perPage"`
	LastPage     int  `json:"lastPage"`
	Total        int  `json:"total"`
	HasMorePages bool `json:"hasMorePages"`
}

type DatasourceCollectionResult struct {
	Items      []map[string]any      `json:"items"`
	Pagination *DatasourcePagination `json:"pagination"`
}

// DatasourceAdapter is the host-facing database contract. Implementations may
// translate the neutral request to database/sql, sqlx, an ORM, an HTTP API, or
// another storage system without changing persisted Page JSON.
type DatasourceAdapter interface {
	Resolve(ctx context.Context, request DatasourceRequest, runtime map[string]any) (any, error)
}

// DatasourceProvider bridges the typed host-facing adapter into the renderer's
// generic binding provider interface.
type DatasourceProvider struct {
	Adapter DatasourceAdapter
}

func (p DatasourceProvider) Resolve(ctx context.Context, binding map[string]any, attrs map[string]any, runtime map[string]any) (any, error) {
	request := DatasourceRequest{
		Provider:   stringValue(binding["source"]),
		Resource:   stringValue(binding["resource"]),
		Mode:       stringValue(binding["mode"]),
		RecordID:   binding["recordId"],
		ContextKey: stringValue(binding["contextKey"]),
		Query:      datasourceQuery(binding["query"]),
	}
	if request.Mode == "" {
		request.Mode = "single"
	}

	return p.Adapter.Resolve(ctx, request, runtime)
}

func datasourceQuery(raw any) DatasourceQuery {
	value, _ := raw.(map[string]any)
	query := DatasourceQuery{
		Limit:   intValue(value["limit"]),
		Offset:  intValue(value["offset"]),
		PerPage: intValue(value["perPage"]),
		Page:    intValue(value["page"]),
	}

	if rawWith, ok := value["with"].([]any); ok {
		for _, entry := range rawWith {
			if relation, ok := entry.(string); ok {
				query.With = append(query.With, relation)
			}
	}
	if rawWhere, ok := value["where"].([]any); ok {
		for _, entry := range rawWhere {
			filter, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			query.Where = append(query.Where, DatasourceFilter{
				Column:   stringValue(filter["column"]),
				Operator: stringValue(filter["operator"]),
				Value:    filter["value"],
			})
		}
	}
	if rawOrder, ok := value["orderBy"].([]any); ok {
		for _, entry := range rawOrder {
			order, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			direction := stringValue(order["direction"])
			if direction == "" {
				direction = "asc"
			}
			query.OrderBy = append(query.OrderBy, DatasourceOrder{
				Column:    stringValue(order["column"]),
				Direction: direction,
			})
		}
	}

	return query
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

func intValue(value any) int {
	switch number := value.(type) {
	case int:
		return number
	case int64:
		return int(number)
	case float64:
		return int(number)
	default:
		return 0
	}
}
