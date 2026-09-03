import type { Breakpoint, LayoutItem, PageBlock, ResponsiveValue, SectionLayout } from './types';

export function responsive<T>(value: ResponsiveValue<T> | undefined, breakpoint: Breakpoint, fallback: T): T {
  if (!value) return fallback;
  return (value[breakpoint] ?? value.desktop ?? fallback) as T;
}

export function patchResponsive<T>(current: ResponsiveValue<T> | undefined, breakpoint: Breakpoint, value: T): ResponsiveValue<T> {
  return { ...(current ?? {}), [breakpoint]: value };
}

export function sectionLayoutStyle(layout: SectionLayout | undefined, breakpoint: Breakpoint): React.CSSProperties {
  const mode = responsive(layout?.mode, breakpoint, 'block');
  if (mode === 'block') return { display: 'block' };
  if (mode === 'flex') {
    return {
      display: 'flex',
      flexDirection: responsive(layout?.flexDirection, breakpoint, 'row'),
      flexWrap: responsive(layout?.flexWrap, breakpoint, 'nowrap'),
      justifyContent: responsive(layout?.justifyContent, breakpoint, 'flex-start'),
      alignItems: responsive(layout?.alignItems, breakpoint, 'stretch'),
      alignContent: responsive(layout?.alignContent, breakpoint, 'stretch'),
      gap: responsive(layout?.gap, breakpoint, '0px'),
      rowGap: responsive(layout?.rowGap, breakpoint, responsive(layout?.gap, breakpoint, '0px')),
      columnGap: responsive(layout?.columnGap, breakpoint, responsive(layout?.gap, breakpoint, '0px')),
    };
  }
  const columns = Math.max(1, responsive(layout?.gridColumns, breakpoint, 1));
  const rows = responsive(layout?.gridRows, breakpoint, 'auto');
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: rows === 'auto' ? undefined : `repeat(${Math.max(1, Number(rows))}, minmax(0, auto))`,
    gridAutoFlow: responsive(layout?.gridAutoFlow, breakpoint, 'row'),
    gap: responsive(layout?.gap, breakpoint, '0px'),
    rowGap: responsive(layout?.rowGap, breakpoint, responsive(layout?.gap, breakpoint, '0px')),
    columnGap: responsive(layout?.columnGap, breakpoint, responsive(layout?.gap, breakpoint, '0px')),
  };
}

export function layoutItemStyle(item: LayoutItem | undefined, parentMode: 'block' | 'flex' | 'grid', breakpoint: Breakpoint): React.CSSProperties {
  if (!item) return {};
  if (parentMode === 'flex') {
    return {
      flexGrow: responsive(item.flexGrow, breakpoint, 0),
      flexShrink: responsive(item.flexShrink, breakpoint, 1),
      flexBasis: responsive(item.flexBasis, breakpoint, 'auto'),
      alignSelf: responsive(item.alignSelf, breakpoint, 'auto'),
      order: responsive(item.order, breakpoint, 0),
    };
  }
  if (parentMode === 'grid') {
    const columnSpan = Math.max(1, responsive(item.columnSpan, breakpoint, 1));
    const rowSpan = Math.max(1, responsive(item.rowSpan, breakpoint, 1));
    const columnStart = responsive(item.columnStart, breakpoint, 'auto');
    const rowStart = responsive(item.rowStart, breakpoint, 'auto');
    return {
      gridColumn: columnStart === 'auto' ? `span ${columnSpan}` : `${columnStart} / span ${columnSpan}`,
      gridRow: rowStart === 'auto' ? `span ${rowSpan}` : `${rowStart} / span ${rowSpan}`,
    };
  }
  return {};
}

export function parentLayout(blocks: PageBlock[], id: string, breakpoint: Breakpoint): 'block' | 'flex' | 'grid' {
  const visit = (items: PageBlock[], parent?: PageBlock): 'block' | 'flex' | 'grid' | null => {
    for (const block of items) {
      if (block.id === id) return responsive(parent?.layout?.mode, breakpoint, 'block');
      const nested = visit(block.children ?? [], block);
      if (nested) return nested;
    }
    return null;
  };
  return visit(blocks) ?? 'block';
}
