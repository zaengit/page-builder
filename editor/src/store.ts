import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { BlockDefinition, BlockLock, BlockStyle, BlockTransform, BlockVariation, EditorRuntime, PageBlock, PageContent, PageSettings, Pattern } from './types';
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
  markSaved: () => void;
  select: (id: string | null) => void;
  addBlock: (type: string, parentId?: string | null, variation?: BlockVariation) => void;
  insertBlock: (block: PageBlock, parentId?: string | null, slot?: string) => void;
  insertPattern: (pattern: Pattern, parentId?: string | null) => void;
  duplicateBlock: (id: string) => void;
  updateAttrs: (id: string, attrs: Record<string, unknown>) => void;
  updateAttrPath: (id: string, path: string[], value: unknown) => void;
  updateStyles: (id: string, styles: Partial<BlockStyle>) => void;
  updateColorScheme: (id: string, colorSchemeId?: string) => void;
  updateBindings: (id: string, bindings: PageBlock['bindings']) => void;
  updateSettings: (settings: Partial<PageSettings>) => void;
  setLock: (id: string, lock: BlockLock) => void;
  applyTransform: (id: string, transform: BlockTransform) => void;
  moveBlock: (activeId: string, overId: string) => void;
  removeBlock: (id: string) => void;
  undo: () => void;
  redo: () => void;
};

export const builderStoreBridge: { current: UseBoundStore<StoreApi<BuilderState>> | null } = { current: null };

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
  return { content, selectedId, past: [...state.past, state.content].slice(-HISTORY_LIMIT), future: [], dirty: snapshot(content) !== state.initialSnapshot };
}

function canEdit(block: PageBlock | null) { return !block?.lock?.edit; }

export function createBuilderStore() {
  const store = create<BuilderState>((set, get) => ({
    content: EMPTY_CONTENT,
    definitions: [], runtime: null, selectedId: null, dirty: false, past: [], future: [], initialSnapshot: snapshot(EMPTY_CONTENT),

    async bootstrap(runtime, initial) {
      const definitions = await api<BlockDefinition[]>(runtime.blocksUrl);
      const content = initial && Array.isArray(initial.blocks) ? { schemaVersion: 1, ...initial } : EMPTY_CONTENT;
      set({ runtime, definitions, content, selectedId: content.blocks[0]?.id ?? null, dirty: false, past: [], future: [], initialSnapshot: snapshot(content) });
    },

    replaceContent(content) {
      const next = content && Array.isArray(content.blocks) ? content : EMPTY_CONTENT;
      set({ content: next, selectedId: next.blocks[0]?.id ?? null, dirty: false, past: [], future: [], initialSnapshot: snapshot(next) });
    },
    markSaved() { const content = get().content; set({ dirty: false, initialSnapshot: snapshot(content), past: [], future: [] }); },
    select(selectedId) { set({ selectedId }); },

    addBlock(type, parent, variation) {
      const definition = get().definitions.find(item => item.name === type); if (!definition) return;
      const attrs = Object.fromEntries(Object.entries(definition.attributes ?? {}).map(([key, schema]) => [key, clone(schema.default)]));
      get().insertBlock({ id: crypto.randomUUID(), type, version: definition.version ?? 1, attrs: { ...attrs, ...clone(variation?.attrs ?? {}) }, ...(definition.supports?.children ? { children: [] } : {}) }, parent);
    },

    insertBlock(block, parent = null, slot) {
      const state = get(); const item = { ...renewIds(block), ...(slot ? { slot } : {}) }; let blocks: PageBlock[];
      if (parent) {
        const parentBlock = findBlock(state.content.blocks, parent); const definition = state.definitions.find(candidate => candidate.name === parentBlock?.type);
        if (!parentBlock || !definition?.supports?.children || parentBlock.lock?.edit) return;
        if (definition.supports.allowedChildren?.length && !definition.supports.allowedChildren.includes(item.type)) return;
        const slotDef = slot ? definition.supports.slots?.find(candidate => candidate.name === slot) : undefined;
        if (slot && !slotDef) return;
        if (slotDef?.allowedChildren?.length && !slotDef.allowedChildren.includes(item.type)) return;
        blocks = updateBlock(state.content.blocks, parent, candidate => ({ ...candidate, children: [...(candidate.children ?? []), item] }));
      } else blocks = [...state.content.blocks, item];
      const update = historyUpdate(state, { ...state.content, blocks }, item.id); if (update) set(update);
    },

    insertPattern(pattern, parent = null) { for (const block of pattern.blocks) get().insertBlock(block, parent); },
    duplicateBlock(id) { const state = get(); const block = findBlock(state.content.blocks, id); if (block && !block.lock?.edit) get().insertBlock(block, findParentId(state.content.blocks, id) ?? null, block.slot); },

    updateAttrs(id, attrs) { const state = get(); if (!canEdit(findBlock(state.content.blocks, id))) return; const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, attrs: { ...block.attrs, ...attrs } })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },
    updateAttrPath(id, path, value) { if (!path.length) return; const state = get(); if (!canEdit(findBlock(state.content.blocks, id))) return; const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, attrs: setPathValue(block.attrs, path, value) as Record<string, unknown> })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },
    updateStyles(id, styles) { const state = get(); if (!canEdit(findBlock(state.content.blocks, id))) return; const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, styles: { ...block.styles, ...styles } })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },
    updateColorScheme(id, colorSchemeId) { const state = get(); if (!canEdit(findBlock(state.content.blocks, id))) return; const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, colorSchemeId: colorSchemeId || undefined })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },
    updateBindings(id, bindings) { const state = get(); if (!canEdit(findBlock(state.content.blocks, id))) return; const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, bindings })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },
    updateSettings(settings) { const state = get(); const content = { ...state.content, settings: { ...state.content.settings, ...settings } }; const update = historyUpdate(state, content); if (update) set(update); },
    setLock(id, lock) { const state = get(); const blocks = updateBlock(state.content.blocks, id, block => ({ ...block, lock: { ...block.lock, ...lock } })); const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update); },

    applyTransform(id, transform) {
      const state = get(); const block = findBlock(state.content.blocks, id); const definition = state.definitions.find(item => item.name === transform.to);
      if (!block || !definition || block.lock?.edit) return;
      const defaults = Object.fromEntries(Object.entries(definition.attributes).map(([key, schema]) => [key, clone(schema.default)]));
      const attrs = { ...defaults, ...(transform.mapAttrs ? transform.mapAttrs(block.attrs) : block.attrs) };
      const blocks = updateBlock(state.content.blocks, id, current => ({ ...current, type: transform.to, version: definition.version, attrs }));
      const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update);
    },

    moveBlock(activeId, overId) {
      if (activeId === overId) return; const state = get(); const active = findBlock(state.content.blocks, activeId); if (!active || active.lock?.move) return;
      const childTarget = overId.startsWith('children:') ? overId.slice(9) : null; const target = findBlock(state.content.blocks, childTarget ?? overId);
      if (!target || findBlock(active.children ?? [], target.id)) return;
      if (childTarget) { const definition = state.definitions.find(candidate => candidate.name === target.type); if (!definition?.supports?.children || target.lock?.edit || (definition.supports.allowedChildren?.length && !definition.supports.allowedChildren.includes(active.type))) return; }
      const result = removeBlockFromTree(state.content.blocks, activeId); if (!result.removed) return; let blocks = result.blocks;
      if (childTarget) blocks = updateBlock(blocks, childTarget, block => ({ ...block, children: [...(block.children ?? []), result.removed!] }));
      else { const parent = findParentId(blocks, overId); if (parent === null) blocks = insertBefore(blocks, overId, result.removed); else if (parent !== undefined) blocks = updateBlock(blocks, parent, block => ({ ...block, children: insertBefore(block.children ?? [], overId, result.removed!) })); }
      const update = historyUpdate(state, { ...state.content, blocks }); if (update) set(update);
    },

    removeBlock(id) { const state = get(); const block = findBlock(state.content.blocks, id); if (!block || block.lock?.remove) return; const result = removeBlockFromTree(state.content.blocks, id); if (!result.removed) return; const selectedRemoved = state.selectedId === id || Boolean(state.selectedId && findBlock(result.removed.children ?? [], state.selectedId)); const update = historyUpdate(state, { ...state.content, blocks: result.blocks }, selectedRemoved ? null : state.selectedId); if (update) set(update); },
    undo() { const state = get(); if (!state.past.length) return; const content = state.past.at(-1)!; set({ content, past: state.past.slice(0, -1), future: [state.content, ...state.future].slice(0, HISTORY_LIMIT), selectedId: state.selectedId && findBlock(content.blocks, state.selectedId) ? state.selectedId : null, dirty: snapshot(content) !== state.initialSnapshot }); },
    redo() { const state = get(); if (!state.future.length) return; const content = state.future[0]; set({ content, past: [...state.past, state.content].slice(-HISTORY_LIMIT), future: state.future.slice(1), selectedId: state.selectedId && findBlock(content.blocks, state.selectedId) ? state.selectedId : null, dirty: snapshot(content) !== state.initialSnapshot }); },
  }));

  builderStoreBridge.current = store;
  return store;
}
