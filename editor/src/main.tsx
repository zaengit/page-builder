import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import { ColorSchemePanel } from './components/ColorSchemePanel';
import { initializeExtensionApi, type PageBuilderApi } from './registry';
import type { EditorRuntime, PageContent } from './types';
import { DEFAULT_RUNTIME, EMPTY_CONTENT, parseJson } from './utils';
import './style.css';

declare global {
  interface Window { PageBuilder?: PageBuilderApi }
}

const extensionApi = initializeExtensionApi();
extensionApi.registerInspectorPanel({
  id: 'core-color-schemes',
  title: 'Color scheme',
  render: ColorSchemePanel,
});

document.querySelectorAll<HTMLElement>('[data-page-builder-root]').forEach(root => {
  const runtime = parseJson<EditorRuntime>(root.dataset.pageBuilderRuntime, DEFAULT_RUNTIME);
  const initial = parseJson<PageContent>(root.dataset.pageBuilderContent, EMPTY_CONTENT);
  createRoot(root).render(<React.StrictMode><EditorApp root={root} runtime={runtime} initial={initial} /></React.StrictMode>);
});
