import { describe, expect, it } from 'vitest';
import { layoutItemStyle, parentLayout, patchResponsive, responsive, sectionLayoutStyle } from './layout';
import { detachBlock, insertIntoParent, moveIntoLayout, updateBlockLayout, updateBlockLayoutItem } from './layout-store';
import type { PageBlock } from './types';

describe('responsive layout system', () => {
  it('resolves responsive values and patches only the active breakpoint', () => {
    expect(responsive(undefined, 'mobile', 'fallback')).toBe('fallback');
    expect(responsive({ desktop: 'desktop' }, 'mobile', 'fallback')).toBe('desktop');
    expect(patchResponsive({ desktop: 1 }, 'tablet', 2)).toEqual({ desktop: 1, tablet: 2 });
  });

  it('renders block mode without flex or grid rules', () => {
    expect(sectionLayoutStyle({ mode: { desktop: 'block' } }, 'desktop')).toEqual({ display: 'block' });
  });

  it('renders flex settings per breakpoint', () => {
    const style = sectionLayoutStyle({
      mode: { desktop: 'flex', mobile: 'flex' },
      flexDirection: { desktop: 'row', mobile: 'column' },
      flexWrap: { desktop: 'wrap' },
      justifyContent: { desktop: 'space-between' },
      alignItems: { desktop: 'center' },
      alignContent: { desktop: 'space-around' },
      gap: { desktop: '24px', mobile: '12px' },
      rowGap: { mobile: '8px' },
      columnGap: { mobile: '10px' },
    }, 'mobile');
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.gap).toBe('12px');
    expect(style.rowGap).toBe('8px');
    expect(style.columnGap).toBe('10px');
  });

  it('renders grid columns, explicit rows, auto flow and child spans', () => {
    const container = sectionLayoutStyle({
      mode: { desktop: 'grid' },
      gridColumns: { desktop: 4 },
      gridRows: { desktop: 3 },
      gridAutoFlow: { desktop: 'row dense' },
      gap: { desktop: '16px' },
    }, 'desktop');
    const item = layoutItemStyle({ columnSpan: { desktop: 2 }, rowSpan: { desktop: 3 }, columnStart: { desktop: 2 }, rowStart: { desktop: 2 } }, 'grid', 'desktop');
    expect(container.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(container.gridTemplateRows).toBe('repeat(3, minmax(0, auto))');
    expect(container.gridAutoFlow).toBe('row dense');
    expect(item.gridColumn).toBe('2 / span 2');
    expect(item.gridRow).toBe('2 / span 3');
  });

  it('renders flex child sizing and alignment metadata', () => {
    const style = layoutItemStyle({
      flexGrow: { desktop: 2 },
      flexShrink: { desktop: 0 },
      flexBasis: { desktop: '240px' },
      alignSelf: { desktop: 'center' },
      order: { desktop: 3 },
    }, 'flex', 'desktop');
    expect(style).toMatchObject({ flexGrow: 2, flexShrink: 0, flexBasis: '240px', alignSelf: 'center', order: 3 });
    expect(layoutItemStyle(undefined, 'grid', 'desktop')).toEqual({});
    expect(layoutItemStyle({}, 'block', 'desktop')).toEqual({});
  });

  it('finds a nested parent layout mode', () => {
    const blocks: PageBlock[] = [{
      id: 'outer', type: 'test/container', attrs: {}, layout: { mode: { desktop: 'grid' } }, children: [
        { id: 'inner', type: 'test/text', attrs: {} },
      ],
    }];
    expect(parentLayout(blocks, 'inner', 'desktop')).toBe('grid');
    expect(parentLayout(blocks, 'missing', 'desktop')).toBe('block');
  });

  it('updates container and item metadata immutably', () => {
    const blocks: PageBlock[] = [{ id: 'parent', type: 'test/container', attrs: {}, children: [{ id: 'child', type: 'test/text', attrs: {} }] }];
    const withLayout = updateBlockLayout(blocks, 'parent', { mode: { desktop: 'flex' } });
    expect(withLayout[0].layout?.mode?.desktop).toBe('flex');
    const withItem = updateBlockLayoutItem(withLayout, 'child', { flexGrow: { desktop: 1 } });
    expect(withItem[0].children?.[0].layoutItem?.flexGrow?.desktop).toBe(1);
    expect(blocks[0].layout).toBeUndefined();
  });

  it('detaches and inserts blocks at root and nested indexes', () => {
    const blocks: PageBlock[] = [
      { id: 'a', type: 'test/text', attrs: {} },
      { id: 'parent', type: 'test/container', attrs: {}, children: [{ id: 'b', type: 'test/text', attrs: {} }] },
    ];
    const detached = detachBlock(blocks, 'b');
    expect(detached.block?.id).toBe('b');
    expect(detached.blocks[1].children).toEqual([]);
    const nested = insertIntoParent(detached.blocks, detached.block!, 'parent', 0);
    expect(nested[1].children?.[0].id).toBe('b');
    const root = insertIntoParent(nested, { id: 'c', type: 'test/text', attrs: {} }, null, 1);
    expect(root.map(block => block.id)).toEqual(['a', 'c', 'parent']);
    expect(detachBlock(root, 'missing').block).toBeUndefined();
  });

  it('moves a block directly into a grid cell', () => {
    const blocks: PageBlock[] = [
      { id: 'source', type: 'test/text', attrs: {} },
      { id: 'grid', type: 'test/container', attrs: {}, children: [], layout: { mode: { desktop: 'grid' }, gridColumns: { desktop: 4 } } },
    ];
    const next = moveIntoLayout(blocks, 'source', 'grid', undefined, { row: 2, column: 3 }, 'desktop');
    const child = next[0].id === 'grid' ? next[0].children?.[0] : next[1].children?.[0];
    expect(child?.id).toBe('source');
    expect(responsive(child?.layoutItem?.rowStart, 'desktop', 'auto')).toBe(2);
    expect(responsive(child?.layoutItem?.columnStart, 'desktop', 'auto')).toBe(3);
  });

  it('moves blocks into flex positions without grid coordinates', () => {
    const blocks: PageBlock[] = [{
      id: 'flex', type: 'test/container', attrs: {}, children: [
        { id: 'one', type: 'test/text', attrs: {} },
        { id: 'two', type: 'test/text', attrs: {} },
      ],
    }];
    const next = moveIntoLayout(blocks, 'two', 'flex', 0, undefined, 'desktop');
    expect(next[0].children?.map(block => block.id)).toEqual(['two', 'one']);
    expect(moveIntoLayout(next, 'missing', 'flex')).toBe(next);
  });
});
