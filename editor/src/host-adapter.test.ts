import { describe, expect, it, vi } from 'vitest';
import { createHttpHostAdapter, createStandaloneHostAdapter } from './host-adapter';
import type { EditorRuntime } from './types';

const runtime: EditorRuntime = {
  blocksUrl: '/blocks',
  renderBlockUrl: '/block',
  renderPageUrl: '/page',
  previewUrl: '/preview',
  dataSources: [{ name: 'context', title: 'Context', paths: [] }],
  dataResources: [{ name: 'products', title: 'Products' }],
};

describe('editor host adapters', () => {
  it('supports a standalone engine without Laravel URLs', async () => {
    const renderPage = vi.fn(async () => ({ html: '<main>ok</main>', assets: { css: [], js: [] }, diagnostics: [] }));
    const host = createStandaloneHostAdapter({
      blocks: [{ name: 'test/text', title: 'Text', category: 'test', version: 1, attributes: {} }],
      renderPage,
      datasource: { sources: [], resources: [{ name: 'posts', title: 'Posts' }] },
    });
    expect(host.id).toBe('standalone');
    expect((await host.loadBlocks())[0].name).toBe('test/text');
    expect((await host.loadDatasourceMetadata?.())?.resources[0].name).toBe('posts');
    expect((await host.renderPage({ version: 1, blocks: [] })).html).toBe('<main>ok</main>');
    expect(renderPage).toHaveBeenCalledOnce();
  });

  it('maps the generic HTTP runtime to the same adapter contract', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/blocks') return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ html: '<div />', assets: { css: [], js: [] }, diagnostics: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const host = createHttpHostAdapter(runtime);
    expect(await host.loadBlocks()).toEqual([]);
    expect((await host.loadDatasourceMetadata?.())?.resources[0].name).toBe('products');
    expect((await host.renderPage({ version: 1, blocks: [] })).html).toBe('<div />');
  });

  it('unwraps Go CMS data envelopes without changing the generic request format', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/blocks') {
        return new Response(JSON.stringify({ data: [{ name: 'core/heading', title: 'Heading', category: 'core', version: 1, attributes: {} }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const sent = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      expect(sent.version).toBe(1);
      expect(sent.page).toBeUndefined();
      return new Response(JSON.stringify({ data: { html: '<h1>Go</h1>', assets: { css: [], js: [] }, diagnostics: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const host = createHttpHostAdapter(runtime);
    expect((await host.loadBlocks())[0].name).toBe('core/heading');
    expect((await host.renderPage({ version: 1, blocks: [] })).html).toBe('<h1>Go</h1>');
  });
});
