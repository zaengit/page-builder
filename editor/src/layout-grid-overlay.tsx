import type { Breakpoint, PageBlock } from './types';
import { GridCellDropIndicator } from './layout-canvas';
import { responsive } from './layout';

export function GridOverlay({ block, breakpoint }: { block: PageBlock; breakpoint: Breakpoint }) {
  const mode = responsive(block.layout?.mode, breakpoint, 'block');
  if (mode !== 'grid') return null;
  const columns = Math.max(1, responsive(block.layout?.gridColumns, breakpoint, 1));
  const explicitRows = responsive(block.layout?.gridRows, breakpoint, 'auto');
  const rows = explicitRows === 'auto' ? Math.max(1, Math.ceil(((block.children?.length ?? 0) + 1) / columns)) : Math.max(1, Number(explicitRows));
  return <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(32px, 1fr))` }}>
    {Array.from({ length: columns * rows }, (_, index) => <div className="pointer-events-auto" key={index}><GridCellDropIndicator parentId={block.id} columns={columns} index={index} /></div>)}
  </div>;
}
