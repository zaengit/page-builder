import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBuilderStore, findBlock } from './store';
import type { BlockDefinition, EditorRuntime } from './types';

const runtime: EditorRuntime = { blocksUrl: '/blocks', renderBlockUrl: '/render-block', renderPageUrl: '/render-page', previewUrl: '/preview' };
const definitions: BlockDefinition[] = [
  { name: 'test/container', title: 'Container', category: 'test', version: 2, attributes: {}, supports: { children: true, allowedChildren: ['test/text'] } },
  { name: 'test/text', title: 'Text', category: 'test', version: 3, attributes: { text: { type: 'string', default: 'Hello' }, slides: { type: 'repeater', default: [{ image: '' }], fields: { image: { type: 'image' } } } } },
  { name: 'test/other', title: 'Other', category: 'test', version: 1, attributes: {} },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(definitions), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});

describe('builder store', () => {
  it('stamps manifest version and keeps stores isolated', async () => {
    const first = createBuilderStore();
    const second = createBuilderStore();
    await first.getState().bootstrap(runtime);
    await second.getState().bootstrap(runtime);
    first.getState().addBlock('test/text');
    expect(first.getState().content.blocks).toHaveLength(1);
    expect(first.getState().content.blocks[0].version).toBe(3);
    expect(second.getState().content.blocks).toHaveLength(0);
  });

  it('enforces allowed children and supports undo/redo', async () => {
    const store = createBuilderStore();
    await store.getState().bootstrap(runtime);
    store.getState().addBlock('test/container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/other', parent);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(0);
    store.getState().addBlock('test/text', parent);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(1);
    store.getState().undo();
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(0);
    store.getState().redo();
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(1);
  });

  it('updates nested repeater media paths immutably', async () => {
    const store = createBuilderStore();
    await store.getState().bootstrap(runtime);
    store.getState().addBlock('test/text');
    const id = store.getState().selectedId!;
    store.getState().updateAttrPath(id, ['slides', '0', 'image'], '/media/a.jpg');
    const block = findBlock(store.getState().content.blocks, id)!;
    expect(block.attrs.slides).toEqual([{ image: '/media/a.jpg' }]);
  });

  it('clears descendant selection when parent is removed', async () => {
    const store = createBuilderStore();
    await store.getState().bootstrap(runtime);
    store.getState().addBlock('test/container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/text', parent);
    const child = store.getState().selectedId!;
    store.getState().select(child);
    store.getState().removeBlock(parent);
    expect(store.getState().selectedId).toBeNull();
  });
});
