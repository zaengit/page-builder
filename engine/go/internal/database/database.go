package database

import "context"

// Queryer is the minimal database contract needed by Go datasource adapters.
// Concrete SQL drivers stay in the host application and can be injected without
// coupling the universal engine to a specific database package.
type Queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (Rows, error)
}

type Rows interface {
	Next() bool
	Scan(dest ...any) error
	Columns() ([]string, error)
	Err() error
	Close() error
}
