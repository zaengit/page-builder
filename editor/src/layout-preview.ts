import type { Breakpoint, PageBlock } from './types';
import { layoutItemStyle, responsive, sectionLayoutStyle } from './layout';

export function layoutCssForBlock(block: PageBlock, parent: PageBlock | undefined, breakpoint: Breakpoint): string {
  const container = sectionLayoutStyle(block.layout, breakpoint) as Record<string, unknown>;
  const parentMode = responsive(parent?.layout?.mode, breakpoint, 'block');
  const item = layoutItemStyle(block.layoutItem, parentMode, breakpoint) as Record<string, unknown>;
  return cssText({ ...container, ...item });
}

function cssText(style: Record<string, unknown>): string {
  return Object.entries(style).filter(([,v]) => v !== undefined && v !== null && v !== '').map(([key,value]) => `${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${String(value)}`).join(';');
}

export function injectLayoutStyles(root: Document, blocks: PageBlock[], breakpoint: Breakpoint): void {
  const walk = (items: PageBlock[], parent?: PageBlock) => {
    for (const block of items) {
      const el = root.querySelector<HTMLElement>(`[data-pb-id="${CSS.escape(block.id)}"]`);
      if (el) el.style.cssText += `;${layoutCssForBlock(block, parent, breakpoint)}`;
      walk(block.children ?? [], block);
    }
  };
  walk(blocks);
}
