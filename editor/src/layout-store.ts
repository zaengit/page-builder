import type { Breakpoint, LayoutItem, PageBlock, SectionLayout } from './types';
import { patchResponsive } from './layout';

export function updateBlockLayout(blocks: PageBlock[], id: string, layout: SectionLayout): PageBlock[] {
  return blocks.map(block => block.id === id ? { ...block, layout } : { ...block, children: block.children ? updateBlockLayout(block.children, id, layout) : block.children });
}

export function updateBlockLayoutItem(blocks: PageBlock[], id: string, layoutItem: LayoutItem): PageBlock[] {
  return blocks.map(block => block.id === id ? { ...block, layoutItem } : { ...block, children: block.children ? updateBlockLayoutItem(block.children, id, layoutItem) : block.children });
}

export function detachBlock(blocks: PageBlock[], id: string): { blocks: PageBlock[]; block?: PageBlock } {
  let found: PageBlock | undefined;
  const walk = (items: PageBlock[]): PageBlock[] => items.flatMap(block => {
    if (block.id === id) { found = block; return []; }
    return [{ ...block, children: block.children ? walk(block.children) : block.children }];
  });
  return { blocks: walk(blocks), block: found };
}

export function insertIntoParent(blocks: PageBlock[], block: PageBlock, parentId: string | null, index?: number): PageBlock[] {
  if (!parentId) {
    const next = [...blocks]; next.splice(index ?? next.length, 0, block); return next;
  }
  return blocks.map(item => {
    if (item.id === parentId) {
      const children = [...(item.children ?? [])]; children.splice(index ?? children.length, 0, block); return { ...item, children };
    }
    return { ...item, children: item.children ? insertIntoParent(item.children, block, parentId, index) : item.children };
  });
}

export function moveIntoLayout(blocks: PageBlock[], blockId: string, parentId: string | null, index?: number, grid?: { row: number; column: number }, breakpoint: Breakpoint = 'desktop'): PageBlock[] {
  const detached = detachBlock(blocks, blockId);
  if (!detached.block) return blocks;
  let moved = detached.block;
  if (grid) {
    moved = { ...moved, layoutItem: {
      ...(moved.layoutItem ?? {}),
      rowStart: patchResponsive(moved.layoutItem?.rowStart, breakpoint, grid.row),
      columnStart: patchResponsive(moved.layoutItem?.columnStart, breakpoint, grid.column),
    } };
  }
  return insertIntoParent(detached.blocks, moved, parentId, index);
}
