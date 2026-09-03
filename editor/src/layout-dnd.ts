import type { DragEndEvent } from '@dnd-kit/core';
import type { Breakpoint, PageBlock } from './types';
import { moveIntoLayout } from './layout-store';

export type LayoutDropResult = { blocks: PageBlock[]; handled: boolean };

export function applyLayoutDrop(blocks: PageBlock[], event: DragEndEvent, breakpoint: Breakpoint): LayoutDropResult {
  const { active, over } = event;
  if (!over || active.id === over.id) return { blocks, handled: false };
  const overId = String(over.id);
  const activeId = String(active.id);
  if (overId.startsWith('container:')) {
    return { blocks: moveIntoLayout(blocks, activeId, overId.slice('container:'.length), undefined, undefined, breakpoint), handled: true };
  }
  if (overId.startsWith('gridcell:')) {
    const [, parentId, rowRaw, colRaw] = overId.split(':');
    return { blocks: moveIntoLayout(blocks, activeId, parentId, undefined, { row: Number(rowRaw), column: Number(colRaw) }, breakpoint), handled: true };
  }
  return { blocks, handled: false };
}
