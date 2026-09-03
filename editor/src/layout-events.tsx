import type { Breakpoint, LayoutItem, PageBlock, SectionLayout } from './types';
import { LayoutItemInspector, SectionLayoutInspector } from './layout-inspector';
import { LAYOUT_EVENT, LAYOUT_ITEM_EVENT } from './layout-runtime';

export function EventSectionLayoutInspector({ block, breakpoint }: { block: PageBlock; breakpoint: Breakpoint }) {
  return <SectionLayoutInspector block={block} breakpoint={breakpoint} onChange={(layout: SectionLayout) => dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: { blockId: block.id, layout } }))} />;
}

export function EventLayoutItemInspector({ block, allBlocks, breakpoint }: { block: PageBlock; allBlocks: PageBlock[]; breakpoint: Breakpoint }) {
  return <LayoutItemInspector block={block} allBlocks={allBlocks} breakpoint={breakpoint} onChange={(layoutItem: LayoutItem) => dispatchEvent(new CustomEvent(LAYOUT_ITEM_EVENT, { detail: { blockId: block.id, layoutItem } }))} />;
}
