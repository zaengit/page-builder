# Conformance Authoring Guide

Shared fixtures live in `specification/conformance/` and are engine-neutral JSON. Renderer fixtures contain `version`, `registry`, `page`, `context`, and `expected`; template fixtures contain `templateCases`; datasource fixtures contain valid/invalid request and response cases.

Add a fixture whenever a semantic rule is introduced or a parity bug is fixed. Expected output must be deterministic: stable asset order, stable CSS declaration order, stable diagnostic ordering, and no engine-specific values. Invalid page fixtures set `pageSchemaValid: false` so schema validation can distinguish intentional negative tests.

CI validates fixture shapes against the canonical schemas. Laravel and Go then consume the same files. A semantic change is incomplete until both engines pass the new fixture. Third engines should run the identical corpus instead of copying expected behavior from Laravel or Go source.
