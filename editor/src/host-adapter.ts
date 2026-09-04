import type { BlockDefinition, DataResource, DataSource, EditorRuntime, PageBlock, PageContent } from './types';

export type RenderAssetSet = { css: string[]; js: string[] };
export type RenderDiagnostic = { code: string; severity: 'info' | 'warning' | 'error'; path: string | null; message: string | null };
export type RenderOutput = { html: string; assets: RenderAssetSet; diagnostics?: RenderDiagnostic[] };
export type DatasourceMetadata = { sources: DataSource[]; resources: DataResource[] };
export type MediaItem = { id: string; name: string; url: string; mimeType?: string; size?: number; updatedAt?: number };

type APIEnvelope<T> = { data?: T; error?: { code?: string; message?: string }; message?: string; errors?: Record<string, unknown> };

export interface EditorHostAdapter {
  readonly id: string;
  readonly specificationVersion: 1;
  loadBlocks(): Promise<BlockDefinition[]>;
  renderPage(page: PageContent, context?: Record<string, unknown>): Promise<RenderOutput>;
  renderBlock?(block: PageBlock, context?: Record<string, unknown>): Promise<RenderOutput>;
  loadDatasourceMetadata?(): Promise<DatasourceMetadata>;
  listMedia?(query?: string): Promise<MediaItem[]>;
  uploadMedia?(file: File): Promise<MediaItem>;
  deleteMedia?(id: string): Promise<void>;
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const record = body && typeof body === 'object' ? body as APIEnvelope<unknown> : {};
    const errors = record.errors && typeof record.errors === 'object'
      ? Object.values(record.errors).flat().join(' ')
      : '';
    throw new Error(record.error?.message || errors || record.message || `Request failed (${response.status})`);
  }
  return body as T;
}

function data<T>(body: T | APIEnvelope<T>): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as APIEnvelope<T>).data as T;
  }
  return body as T;
}

export function createHttpHostAdapter(runtime: EditorRuntime): EditorHostAdapter {
  const request = (url: string, init?: RequestInit) => fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });

  return {
    id: 'http',
    specificationVersion: 1,
    async loadBlocks() {
      return data(await json<BlockDefinition[] | APIEnvelope<BlockDefinition[]>>(await request(runtime.blocksUrl)));
    },
    async renderPage(page, context) {
      const payload = context && Object.keys(context).length > 0 ? { ...page, context } : page;
      return data(await json<RenderOutput | APIEnvelope<RenderOutput>>(await request(runtime.renderPageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })));
    },
    async renderBlock(block, context) {
      return data(await json<RenderOutput | APIEnvelope<RenderOutput>>(await request(runtime.renderBlockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block, context: context ?? {} }),
      })));
    },
    async loadDatasourceMetadata() {
      return { sources: runtime.dataSources ?? [], resources: runtime.dataResources ?? [] };
    },
    ...(runtime.mediaListUrl ? {
      async listMedia(query = '') {
        const separator = runtime.mediaListUrl!.includes('?') ? '&' : '?';
        const result = await json<MediaItem[] | APIEnvelope<MediaItem[]>>(await request(`${runtime.mediaListUrl}${separator}q=${encodeURIComponent(query)}`));
        return data(result) ?? [];
      },
    } : {}),
    ...(runtime.mediaUploadUrl ? {
      async uploadMedia(file: File) {
        const form = new FormData();
        form.append('file', file);
        const result = await json<MediaItem | APIEnvelope<MediaItem>>(await request(runtime.mediaUploadUrl!, { method: 'POST', body: form }));
        return data(result);
      },
    } : {}),
    ...(runtime.mediaDeleteUrl ? {
      async deleteMedia(id: string) {
        const url = runtime.mediaDeleteUrl!.replace('{media}', encodeURIComponent(id));
        const response = await request(url, { method: 'DELETE' });
        if (response.status !== 204) {
          await json<unknown>(response);
        }
      },
    } : {}),
  };
}

export type StandaloneHostOptions = {
  blocks: BlockDefinition[] | (() => Promise<BlockDefinition[]>);
  renderPage: (page: PageContent, context: Record<string, unknown>) => Promise<RenderOutput> | RenderOutput;
  renderBlock?: (block: PageBlock, context: Record<string, unknown>) => Promise<RenderOutput> | RenderOutput;
  datasource?: DatasourceMetadata;
};

export function createStandaloneHostAdapter(options: StandaloneHostOptions): EditorHostAdapter {
  return {
    id: 'standalone',
    specificationVersion: 1,
    async loadBlocks() { return typeof options.blocks === 'function' ? options.blocks() : options.blocks; },
    async renderPage(page, context = {}) { return options.renderPage(page, context); },
    ...(options.renderBlock ? { async renderBlock(block: PageBlock, context: Record<string, unknown> = {}) { return options.renderBlock!(block, context); } } : {}),
    ...(options.datasource ? { async loadDatasourceMetadata() { return options.datasource!; } } : {}),
  };
}
