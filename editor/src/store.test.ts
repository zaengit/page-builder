import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBuilderStore, findBlock } from './store';
import type { BlockDefinition, EditorRuntime, PageBlock } from './types';

const runtime: EditorRuntime = { blocksUrl: '/blocks', renderBlockUrl: '/render-block', renderPageUrl: '/render-page', previewUrl: '/preview' };
const definitions: BlockDefinition[] = [
  { name: 'test/container', title: 'Container', category: 'test', version: 2, attributes: {}, supports: { children: true, allowedChildren: ['test/text'] } },
  { name: 'test/free-container', title: 'Free container', category: 'test', version: 1, attributes: {}, supports: { children: true } },
  { name: 'test/text', title: 'Text', category: 'test', version: 3, attributes: { text: { type: 'string', default: 'Hello' }, slides: { type: 'repeater', default: [{ image: '' }], fields: { image: { type: 'image' } } } }, variations: [{ name: 'alt', title: 'Alt', attrs: { text: 'Alternative' } }] },
  { name: 'test/other', title: 'Other', category: 'test', version: 1, attributes: {} },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(definitions), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});

async function readyStore() {
  const store = createBuilderStore();
  await store.getState().bootstrap(runtime);
  return store;
}

describe('builder store', () => {
  it('bootstraps initial content, replaces content, selects blocks, and rejects failed APIs', async () => {
    const initial = { blocks: [{ id: 'seed', type: 'test/text', version: 3, attrs: { text: 'Seed', slides: [] } }] };
    const store = createBuilderStore();
    await store.getState().bootstrap(runtime, initial);
    expect(store.getState().selectedId).toBe('seed');
    expect(store.getState().dirty).toBe(false);
    store.getState().replaceContent({ blocks: [{ id: 'next', type: 'test/other', version: 1, attrs: {} }] });
    expect(store.getState().selectedId).toBe('next');
    store.getState().select(null);
    expect(store.getState().selectedId).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(createBuilderStore().getState().bootstrap(runtime)).rejects.toThrow('Request failed (503)');
  });

  it('stamps manifest version, applies variations, ignores unknown blocks, and keeps stores isolated', async () => {
    const first = await readyStore();
    const second = await readyStore();
    first.getState().addBlock('test/text', null, definitions[2].variations?.[0]);
    first.getState().addBlock('test/missing');
    expect(first.getState().content.blocks).toHaveLength(1);
    expect(first.getState().content.blocks[0].version).toBe(3);
    expect(first.getState().content.blocks[0].attrs.text).toBe('Alternative');
    expect(second.getState().content.blocks).toHaveLength(0);
  });

  it('enforces allowed children and ignores unsupported or missing parents', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/other', parent);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(0);
    store.getState().addBlock('test/text', parent);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(1);
    const loose: PageBlock = { id: 'source', type: 'test/text', version: 3, attrs: { text: 'x', slides: [] } };
    store.getState().insertBlock(loose, 'missing-parent');
    expect(store.getState().content.blocks).toHaveLength(1);
    const child = findBlock(store.getState().content.blocks, parent)?.children?.[0];
    if (child) store.getState().insertBlock(loose, child.id);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(1);
  });

  it('updates attributes and nested repeater media paths immutably', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/text');
    const id = store.getState().selectedId!;
    store.getState().updateAttrs(id, { text: 'Changed' });
    store.getState().updateAttrPath(id, ['slides', '0', 'image'], '/media/a.jpg');
    store.getState().updateAttrPath(id, [], 'ignored');
    const block = findBlock(store.getState().content.blocks, id)!;
    expect(block.attrs.text).toBe('Changed');
    expect(block.attrs.slides).toEqual([{ image: '/media/a.jpg' }]);
    expect(store.getState().dirty).toBe(true);
  });

  it('updates responsive layout state and moves blocks into layout containers with history', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/free-container');
    const parent = store.getState().selectedId!;
    store.getState().updateLayout(parent, { mode: { desktop: 'grid', mobile: 'flex' }, gridColumns: { desktop: 4 } });
    expect(findBlock(store.getState().content.blocks, parent)?.layout?.gridColumns?.desktop).toBe(4);

    store.getState().addBlock('test/text');
    const child = store.getState().selectedId!;
    store.getState().moveBlockToLayout(child, parent, undefined, { row: 2, column: 3 }, 'desktop');
    expect(findBlock(store.getState().content.blocks, parent)?.children?.[0].id).toBe(child);
    expect(findBlock(store.getState().content.blocks, child)?.layoutItem?.columnStart?.desktop).toBe(3);

    store.getState().updateLayoutItem(child, { columnSpan: { desktop: 2 }, rowSpan: { desktop: 1 } });
    expect(findBlock(store.getState().content.blocks, child)?.layoutItem?.columnSpan?.desktop).toBe(2);
    store.getState().undo();
    expect(findBlock(store.getState().content.blocks, child)?.layoutItem?.columnStart?.desktop).toBe(3);
  });

  it('duplicates root and nested blocks with renewed ids', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/text');
    const rootId = store.getState().selectedId!;
    store.getState().duplicateBlock(rootId);
    expect(store.getState().content.blocks).toHaveLength(2);
    expect(store.getState().content.blocks[0].id).not.toBe(store.getState().content.blocks[1].id);
    store.getState().addBlock('test/container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/text', parent);
    const child = store.getState().selectedId!;
    store.getState().duplicateBlock(child);
    expect(findBlock(store.getState().content.blocks, parent)?.children).toHaveLength(2);
    store.getState().duplicateBlock('missing');
  });

  it('moves root blocks, nested siblings, and blocks into containers', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/text');
    const first = store.getState().selectedId!;
    store.getState().addBlock('test/other');
    const second = store.getState().selectedId!;
    store.getState().moveBlock(second, first);
    expect(store.getState().content.blocks.map(block => block.id)).toEqual([second, first]);
    store.getState().addBlock('test/free-container');
    const parent = store.getState().selectedId!;
    store.getState().moveBlock(first, `children:${parent}`);
    expect(findBlock(store.getState().content.blocks, parent)?.children?.[0].id).toBe(first);
    store.getState().addBlock('test/text', parent);
    const sibling = store.getState().selectedId!;
    store.getState().moveBlock(sibling, first);
    expect(findBlock(store.getState().content.blocks, parent)?.children?.map(block => block.id)).toEqual([sibling, first]);
  });

  it('rejects invalid, disallowed, self, and cyclic move targets', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/container');
    const restrictive = store.getState().selectedId!;
    store.getState().addBlock('test/other');
    const other = store.getState().selectedId!;
    const before = JSON.stringify(store.getState().content);
    store.getState().moveBlock(other, `children:${restrictive}`);
    store.getState().moveBlock(other, other);
    store.getState().moveBlock('missing', restrictive);
    store.getState().moveBlock(other, 'missing');
    expect(JSON.stringify(store.getState().content)).toBe(before);
    store.getState().addBlock('test/free-container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/free-container', parent);
    const child = store.getState().selectedId!;
    const cycleBefore = JSON.stringify(store.getState().content);
    store.getState().moveBlock(parent, `children:${child}`);
    expect(JSON.stringify(store.getState().content)).toBe(cycleBefore);
  });

  it('removes root and nested blocks and clears descendant selection', async () => {
    const store = await readyStore();
    store.getState().addBlock('test/container');
    const parent = store.getState().selectedId!;
    store.getState().addBlock('test/text', parent);
    const child = store.getState().selectedId!;
    store.getState().select(child);
    store.getState().removeBlock(parent);
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().content.blocks).toHaveLength(0);
    store.getState().removeBlock('missing');
    store.getState().addBlock('test/free-container');
    const nextParent = store.getState().selectedId!;
    store.getState().addBlock('test/text', nextParent);
    const nextChild = store.getState().selectedId!;
    store.getState().select(nextParent);
    store.getState().removeBlock(nextChild);
    expect(findBlock(store.getState().content.blocks, nextParent)?.children).toHaveLength(0);
    expect(store.getState().selectedId).toBe(nextParent);
  });

  it('supports undo and redo including empty-history guards and selection cleanup', async () => {
    const store = await readyStore();
    store.getState().undo();
    store.getState().redo();
    store.getState().addBlock('test/text');
    const id = store.getState().selectedId!;
    store.getState().updateAttrs(id, { text: 'Updated' });
    store.getState().undo();
    expect(findBlock(store.getState().content.blocks, id)?.attrs.text).toBe('Hello');
    store.getState().undo();
    expect(store.getState().content.blocks).toHaveLength(0);
    expect(store.getState().selectedId).toBeNull();
    store.getState().redo();
    store.getState().redo();
    expect(findBlock(store.getState().content.blocks, id)?.attrs.text).toBe('Updated');
  });
});
