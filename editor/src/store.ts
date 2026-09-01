import { create } from 'zustand';
import type { BlockDefinition, BlockVariation, EditorRuntime, PageBlock, PageContent } from './types';
import { clone, EMPTY_CONTENT, setPathValue } from './utils';

export type BuilderState = {
  content: PageContent;
  definitions: BlockDefinition[];
  runtime: EditorRuntime | null;
  selectedId: string | null;
  dirty: boolean;
  past: PageContent[];
  future: PageContent[];
  initialSnapshot: string;
  bootstrap: (runtime: EditorRuntime, initial?: PageContent) => Promise<void>;
  replaceContent: (content: PageContent) => void;
  select: (id: string | null) => void;
  addBlock: (type: string, parentId?: string | null, variation?: BlockVariation) => void;
  insertBlock: (block: PageBlock, parentId?: string | null) => void;
  duplicateBlock: (id: string) => void;
  updateAttrs: (id: string, attrs: Record<string, unknown>) => void;
  updateAttrPath: (id: string, path: string[], value: unknown) => void;
  moveBlock: (activeId: string, overId: string) => void;
  removeBlock: (id: string) => void;
  undo: () => void;
  redo: () => void;
};

const HISTORY_LIMIT = 100;
const snapshot = (content: PageContent) => JSON.stringify(content);

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function findBlock(blocks: PageBlock[], id: string | null): PageBlock | null {
  if (!id) return null;
  for (const block of blocks) {
    if (block.id === id) return block;
    const child = findBlock(block.children ?? [], id);
    if (child) return child;
  }
  return null;
}

function updateBlock(blocks: PageBlock[], id: string, transform: (block: PageBlock) => PageBlock): PageBlock[] {
  return blocks.map(block => block.id === id ? transform(block) : { ...block, children: block.children ? updateBlock(block.children, id, transform) : block.children });
}

function removeBlockFromTree(blocks: PageBlock[], id: string): { blocks: PageBlock[]; removed: PageBlock | null } {
  const index = blocks.findIndex(block => block.id === id);
  if (index >= 0) {
    const next = [...blocks];
    const [removed] = next.splice(index, 1);
    return { blocks: next, removed };
  }

  for (const block of blocks) {
    const result = removeBlockFromTree(block.children ?? [], id);
    if (result.removed) return { blocks: blocks.map(item => item.id === block.id ? { ...item, children: result.blocks } : item), removed: result.removed };
  }
  return { blocks, removed: null };
}

function findParentId(blocks: PageBlock[], id: string, parent: string | null = null): string | null | undefined {
  for (const block of blocks) {
    if (block.id === id) return parent;
    const found = findParentId(block.children ?? [], id, block.id);
    if (found !== undefined) return found;
  }
  return undefined;
}

function insertBefore(blocks: PageBlock[], target: string, item: PageBlock): PageBlock[] {
  const index = blocks.findIndex(block => block.id === target);
  if (index < 0) return blocks;
  const next = [...blocks];
  next.splice(index, 0, item);
  return next;
}

function renewIds(block: PageBlock): PageBlock {
  return { ...clone(block), id: crypto.randomUUID(), children: block.children?.map(renewIds) };
}

function historyUpdate(state: BuilderState, content: PageContent, selectedId = state.selectedId) {
  if (snapshot(state.content) === snapshot(content)) return null;
  return {
    content,
    selectedId,
    past: [...state.past, state.content].slice(-HISTORY_LIMIT),
    future: [],
    dirty: snapshot(content) !== state.initialSnapshot,
  };
}

export function createBuilderStore() {
  return create<BuilderState>((set, get) => ({
    content: EMPTY_CONTENT,
    definitions: [],
    runtime: null,
    selectedId: null,
    dirty: false,
    past: [],
    future: [],
    initialSnapshot: snapshot(EMPTY_CONTENT),

    async bootstrap(runtime, initial) {
      const definitions = await api<BlockDefinition[]>(runtime.blocksUrl);
      const content = initial && Array.isArray(initial.blocks) ? initial : EMPTY_CONTENT;
      set({ runtime, definitions, content, selectedId: content.blocks[0]?.id ?? null, dirty: false, past: [], future: [], initialSnapshot: snapshot(content) });
    },

    replaceContent(content) {
      const next = content && Array.isArray(content.blocks) ? content : EMPTY_CONTENT;
      set({ content: next, selectedId: next.blocks[0]?.id ?? null, dirty: false, past: [], future: [], initialSnapshot: snapshot(next) });
    },

    select(selectedId) { set({ selectedId }); },

    addBlock(type, parent, variation) {
      const state = get();
      const definition = state.definitions.find(item => item.name === type);
      if (!definition) return;
      const attrs = Object.fromEntries(Object.entries(definition.attributes ?? {}).map(([key, schema]) => [key, clone(schema.default)]));
      get().insertBlock({ id: crypto.randomUUID(), type, version: definition.version ?? 1, attrs: { ...attrs, ...clone(variation?.attrs ?? {}) }, ...(definition.supports?.children ? { children: [] } : {}) }, parent);
    },

    insertBlock(block, parent = null) {
      const state = get();
      const item = renewIds(block);
      let blocks: PageBlock[];
      if (parent) {
        const parentBlock = findBlock(state.content.blocks, parent);
        const definition = state.definitions.find(candidate => candidate.name === parentBlock?.type);
        if (!parentBlock || !definition?.supports?.children) return;
        if (definition.supports.allowedChildren?.length && !definition.supports.allowedChildren.includes(item.type)) return;
        blocks = updateBlock(state.content.blocks, parent, candidate => ({ ...candidate, children: [...(candidate.children ?? []), item] }));
      } else {
        blocks = [...state.content.blocks, item];
      }
      const update = historyUpdate(state, { blocks }, item.id);
      if (update) set(update);
    },

    duplicateBlock(id) {
      const state = get();
      const block = findBlock(state.content.blocks, id);
      if (block) get().insertBlock(block, findParentId(state.content.blocks, id) ?? null);
    },

    updateAttrs(id, attrs) {
      const state = get();
      const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, attrs: { ...block.attrs, ...attrs } }));
      const update = historyUpdate(state, { blocks });
      if (update) set(update);
    },

    updateAttrPath(id, path, value) {
      if (path.length === 0) return;
      const state = get();
      const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, attrs: setPathValue(block.attrs, path, value) as Record<string, unknown> }));
      const update = historyUpdate(state, { blocks });
      if (update) set(update);
    },

    moveBlock(activeId, overId) {
      if (activeId === overId) return;
      const state = get();
      const active = findBlock(state.content.blocks, activeId);
      if (!active) return;
      const childTarget = overId.startsWith('children:') ? overId.slice(9) : null;
      const target = findBlock(state.content.blocks, childTarget ?? overId);
      if (!target || findBlock(active.children ?? [], target.id)) return;
      if (childTarget) {
        const definition = state.definitions.find(candidate => candidate.name === target.type);
        if (!definition?.supports?.children || (definition.supports.allowedChildren?.length && !definition.supports.allowedChildren.includes(active.type))) return;
      }
      const result = removeBlockFromTree(state.content.blocks, activeId);
      if (!result.removed) return;
      let blocks = result.blocks;
      if (childTarget) blocks = updateBlock(blocks, childTarget, block => ({ ...block, children: [...(block.children ?? []), result.removed!] }));
      else {
        const parent = findParentId(blocks, overId);
        if (parent === null) blocks = insertBefore(blocks, overId, result.removed);
        else if (parent !== undefined) blocks = updateBlock(blocks, parent, block => ({ ...block, children: insertBefore(block.children ?? [], overId, result.removed!) }));
      }
      const update = historyUpdate(state, { blocks });
      if (update) set(update);
    },

    removeBlock(id) {
      const state = get();
      const result = removeBlockFromTree(state.content.blocks, id);
      if (!result.removed) return;
      const selectedRemoved = state.selectedId === id || Boolean(state.selectedId && findBlock(result.removed.children ?? [], state.selectedId));
      const update = historyUpdate(state, { blocks: result.blocks }, selectedRemoved ? null : state.selectedId);
      if (update) set(update);
    },

    undo() {
      const state = get();
      if (!state.past.length) return;
      const content = state.past.at(-1)!;
      set({ content, past: state.past.slice(0, -1), future: [state.content, ...state.future].slice(0, HISTORY_LIMIT), selectedId: state.selectedId && findBlock(content.blocks, state.selectedId) ? state.selectedId : null, dirty: snapshot(content) !== state.initialSnapshot });
    },

    redo() {
      const state = get();
      if (!state.future.length) return;
      const content = state.future[0];
      set({ content, past: [...state.past, state.content].slice(-HISTORY_LIMIT), future: state.future.slice(1), selectedId: state.selectedId && findBlock(content.blocks, state.selectedId) ? state.selectedId : null, dirty: snapshot(content) !== state.initialSnapshot });
    },
  }));
}
