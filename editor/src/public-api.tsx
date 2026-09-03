import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import type { EditorHostAdapter } from './host-adapter';
import type { EditorRuntime, PageContent } from './types';
import { DEFAULT_RUNTIME, EMPTY_CONTENT } from './utils';

export type MountPageBuilderOptions = {
  host: EditorHostAdapter;
  initial?: PageContent;
  runtime?: Partial<EditorRuntime>;
  strictMode?: boolean;
};

export type MountedPageBuilder = { unmount(): void };

export async function mountPageBuilder(root: HTMLElement, options: MountPageBuilderOptions): Promise<MountedPageBuilder> {
  const [blocks, datasource] = await Promise.all([
    options.host.loadBlocks(),
    options.host.loadDatasourceMetadata?.() ?? Promise.resolve({ sources: [], resources: [] }),
  ]);
  const blocksUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(blocks))}`;
  const runtime: EditorRuntime & { hostAdapter: EditorHostAdapter } = {
    ...DEFAULT_RUNTIME,
    ...options.runtime,
    blocksUrl,
    dataSources: datasource.sources,
    dataResources: datasource.resources,
    hostAdapter: options.host,
  };
  const reactRoot: Root = createRoot(root);
  const editor = <EditorApp root={root} runtime={runtime} initial={options.initial ?? EMPTY_CONTENT} />;
  reactRoot.render(options.strictMode === false ? editor : <React.StrictMode>{editor}</React.StrictMode>);
  return { unmount: () => reactRoot.unmount() };
}
