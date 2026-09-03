# Datasource Reference

The universal contract is `specification/datasource.schema.json`. A request names a neutral `provider` and `resource`; it may select `single` or `collection` mode, a `recordId`, a runtime `contextKey`, and a query containing `where`, `orderBy`, `with`, `limit`, `offset`, `perPage`, and `page`.

Filters use a column, a defined operator, and an optional JSON value. Ordering is stable in request order. `limit`/`offset` apply to non-paginated collections; `perPage`/`page` activate pagination. Includes/relations are neutral relation paths and are mapped by the host adapter. Current-record context is runtime-only and is never persisted as a framework model.

Collection results contain `items` and optional pagination metadata. Single results are JSON objects or null. Host/database failures must surface as structured renderer diagnostics rather than adding implementation fields to Page JSON.

Laravel maps resource names to Eloquent models in host configuration. Go exposes `DatasourceAdapter`; other engines may map the same request to SQL, HTTP, an ORM, or another data source.
