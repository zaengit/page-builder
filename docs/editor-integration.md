# React Editor Integration

The editor exports `mountPageBuilder`, `EditorApp`, `EditorHostAdapter`, `createHttpHostAdapter`, `createStandaloneHostAdapter`, and universal document types from `editor/src/index.ts` / the built `dist/index.js` entry.

A host adapter supplies block definitions and page rendering. Optional methods expose block rendering, datasource metadata, and media operations. The editor therefore does not require Laravel routes: a browser app can provide an in-memory/HTTP adapter backed by Go, Node, Rust, Python, or a remote renderer.

```ts
const host = createStandaloneHostAdapter({
  blocks,
  renderPage: async (page, context) => renderWithYourHost(page, context),
});
await mountPageBuilder(element, { host, initial: { version: 1, blocks: [] } });
```

`createHttpHostAdapter(runtime)` preserves the URL-based host integration used by the Laravel package. Both paths persist identical Page JSON.
