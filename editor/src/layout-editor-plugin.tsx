import type { Breakpoint, LayoutItem, PageBlock, SectionLayout } from './types';
import { LayoutItemInspector, SectionLayoutInspector } from './layout-inspector';

export function LayoutInspectorPanels({ selected, blocks, breakpoint, canLayout, onLayout, onLayoutItem }: {
  selected: PageBlock;
  blocks: PageBlock[];
  breakpoint: Breakpoint;
  canLayout: boolean;
  onLayout: (layout: SectionLayout) => void;
  onLayoutItem: (layoutItem: LayoutItem) => void;
}) {
  return <>
    {canLayout && <div className="space-y-3 p-3"><p className="text-[11px] font-semibold">Layout · {breakpoint}</p><SectionLayoutInspector block={selected} breakpoint={breakpoint} onChange={onLayout} /></div>}
    <div className="p-3"><LayoutItemInspector block={selected} allBlocks={blocks} breakpoint={breakpoint} onChange={onLayoutItem} /></div>
  </>;
}
