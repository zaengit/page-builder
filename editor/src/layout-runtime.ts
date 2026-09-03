import type { Breakpoint, PageBlock, PageContent, SectionLayout, LayoutItem } from './types';
import { injectLayoutStyles } from './layout-preview';
import { updateBlockLayout, updateBlockLayoutItem, moveIntoLayout } from './layout-store';

export const LAYOUT_EVENT = 'page-builder:layout-change';
export const LAYOUT_ITEM_EVENT = 'page-builder:layout-item-change';
export const LAYOUT_MOVE_EVENT = 'page-builder:layout-move';

export type LayoutChangeDetail = { blockId: string; layout: SectionLayout };
export type LayoutItemChangeDetail = { blockId: string; layoutItem: LayoutItem };
export type LayoutMoveDetail = { blockId: string; parentId: string | null; index?: number; grid?: { row: number; column: number }; breakpoint: Breakpoint };

export function installLayoutRuntime(options: {
  getContent: () => PageContent;
  replaceBlocks: (blocks: PageBlock[]) => void;
  getPreviewDocument?: () => Document | null | undefined;
  getBreakpoint: () => Breakpoint;
}) {
  const onLayout = (event: Event) => {
    const detail = (event as CustomEvent<LayoutChangeDetail>).detail;
    options.replaceBlocks(updateBlockLayout(options.getContent().blocks, detail.blockId, detail.layout));
  };
  const onItem = (event: Event) => {
    const detail = (event as CustomEvent<LayoutItemChangeDetail>).detail;
    options.replaceBlocks(updateBlockLayoutItem(options.getContent().blocks, detail.blockId, detail.layoutItem));
  };
  const onMove = (event: Event) => {
    const detail = (event as CustomEvent<LayoutMoveDetail>).detail;
    options.replaceBlocks(moveIntoLayout(options.getContent().blocks, detail.blockId, detail.parentId, detail.index, detail.grid, detail.breakpoint));
  };
  addEventListener(LAYOUT_EVENT, onLayout);
  addEventListener(LAYOUT_ITEM_EVENT, onItem);
  addEventListener(LAYOUT_MOVE_EVENT, onMove);
  const refresh = () => {
    const doc = options.getPreviewDocument?.();
    if (doc) injectLayoutStyles(doc, options.getContent().blocks, options.getBreakpoint());
  };
  return { refresh, destroy() { removeEventListener(LAYOUT_EVENT, onLayout); removeEventListener(LAYOUT_ITEM_EVENT, onItem); removeEventListener(LAYOUT_MOVE_EVENT, onMove); } };
}
