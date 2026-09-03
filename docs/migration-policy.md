# Migration Policy

A Page JSON migration is required only when the canonical page-document version changes. Switching between conforming engines at the same specification version is never a migration.

Migrations must be deterministic JSON-to-JSON transformations, preserve unknown forward-compatible metadata where allowed, and never insert framework class names or runtime handles. A new document version must ship with schema changes, compatibility documentation, migration examples, and conformance fixtures for old/new boundaries.

Engine releases may drop an old specification version only in a documented major release. Hosts should reject unsupported versions with structured diagnostics instead of attempting implicit best-effort conversion during rendering.
