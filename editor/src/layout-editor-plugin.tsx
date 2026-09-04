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
    {canLayout && <div className="space-y-3"><p className="editor-section-label">Section layout · {breakpoint}</p><SectionLayoutInspector block={selected} breakpoint={breakpoint} onChange={onLayout} /></div>}
    <div className="pt-4"><LayoutItemInspector block={selected} allBlocks={blocks} breakpoint={breakpoint} onChange={onLayoutItem} /></div>
  </>;
}
