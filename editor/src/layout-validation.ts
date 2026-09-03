import type { Breakpoint, PageBlock } from './types';
import { responsive } from './layout';

export type LayoutIssue = { blockId: string; message: string };

export function validateLayouts(blocks: PageBlock[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const visit = (items: PageBlock[], parent?: PageBlock) => {
    for (const block of items) {
      for (const bp of ['desktop','tablet','mobile'] as Breakpoint[]) {
        const mode = responsive(block.layout?.mode, bp, 'block');
        if (mode === 'grid' && responsive(block.layout?.gridColumns, bp, 1) < 1) issues.push({ blockId: block.id, message: `${bp}: grid columns must be >= 1` });
        const parentMode = responsive(parent?.layout?.mode, bp, 'block');
        if (parentMode === 'grid') {
          if (responsive(block.layoutItem?.columnSpan, bp, 1) < 1) issues.push({ blockId: block.id, message: `${bp}: column span must be >= 1` });
          if (responsive(block.layoutItem?.rowSpan, bp, 1) < 1) issues.push({ blockId: block.id, message: `${bp}: row span must be >= 1` });
        }
      }
      visit(block.children ?? [], block);
    }
  };
  visit(blocks);
  return issues;
}
