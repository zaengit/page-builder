import { describe, expect, it } from 'vitest';
import { layoutItemStyle, responsive, sectionLayoutStyle } from './layout';
import { moveIntoLayout } from './layout-store';
import type { PageBlock } from './types';

describe('responsive layout system', () => {
  it('renders flex settings per breakpoint', () => {
    const style = sectionLayoutStyle({
      mode: { desktop: 'flex', mobile: 'flex' },
      flexDirection: { desktop: 'row', mobile: 'column' },
      flexWrap: { desktop: 'wrap' },
      justifyContent: { desktop: 'space-between' },
      alignItems: { desktop: 'center' },
      gap: { desktop: '24px', mobile: '12px' },
    }, 'mobile');
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.gap).toBe('12px');
  });

  it('renders grid columns and child spans', () => {
    const container = sectionLayoutStyle({ mode: { desktop: 'grid' }, gridColumns: { desktop: 4 }, gap: { desktop: '16px' } }, 'desktop');
    const item = layoutItemStyle({ columnSpan: { desktop: 2 }, rowSpan: { desktop: 3 }, columnStart: { desktop: 2 } }, 'grid', 'desktop');
    expect(container.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(item.gridColumn).toBe('2 / span 2');
    expect(item.gridRow).toBe('span 3');
  });

  it('moves a block directly into a grid cell', () => {
    const blocks: PageBlock[] = [
      { id: 'source', type: 'core/heading', attrs: {} },
      { id: 'grid', type: 'core/container', attrs: {}, children: [], layout: { mode: { desktop: 'grid' }, gridColumns: { desktop: 4 } } },
    ];
    const next = moveIntoLayout(blocks, 'source', 'grid', undefined, { row: 2, column: 3 }, 'desktop');
    const child = next[0].id === 'grid' ? next[0].children?.[0] : next[1].children?.[0];
    expect(child?.id).toBe('source');
    expect(responsive(child?.layoutItem?.rowStart, 'desktop', 'auto')).toBe(2);
    expect(responsive(child?.layoutItem?.columnStart, 'desktop', 'auto')).toBe(3);
  });
});
