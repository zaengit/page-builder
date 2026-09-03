# Page Builder Editor

Engine-neutral React visual editor for Page Builder specification v1.

The package exposes `mountPageBuilder`, `EditorApp`, `EditorHostAdapter`, `createHttpHostAdapter`, and `createStandaloneHostAdapter`. A host adapter owns block discovery, rendering, datasource metadata, and optional media integration, so the editor can run with Laravel, Go, or any conforming engine.

```ts
import { createStandaloneHostAdapter, mountPageBuilder } from 'page-builder-editor';
import 'page-builder-editor/style.css';

const host = createStandaloneHostAdapter({
  blocks,
  renderPage: (page, context) => renderer.render(page, context),
});

await mountPageBuilder(document.querySelector('#editor')!, {
  host,
  initial: { version: 1, blocks: [] },
});
```

For URL-based hosts, use `createHttpHostAdapter(runtime)`. Persisted content is always canonical version-1 Page JSON and is not tied to any engine implementation.
