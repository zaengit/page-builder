import type { AttrSchema, EditorRuntime, PageContent } from './types';

export const EMPTY_CONTENT: PageContent = { blocks: [] };

export const DEFAULT_RUNTIME: EditorRuntime = {
  blocksUrl: '/api/page-builder/blocks',
  renderBlockUrl: '/api/page-builder/render-block',
  renderPageUrl: '/api/page-builder/render-page',
  previewUrl: '/page-builder/preview',
};

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function defaults(fields: Record<string, AttrSchema> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [key, clone(schema.default ?? '')]),
  );
}

export function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function setPathValue(source: unknown, path: string[], value: unknown): unknown {
  if (path.length === 0) return value;

  const [head, ...tail] = path;
  const index = Number(head);

  if (Array.isArray(source) && Number.isInteger(index)) {
    const next = [...source];
    next[index] = setPathValue(next[index], tail, value);
    return next;
  }

  const object = source && typeof source === 'object' && !Array.isArray(source)
    ? source as Record<string, unknown>
    : {};

  return { ...object, [head]: setPathValue(object[head], tail, value) };
}
