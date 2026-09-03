import type { LayoutItem, SectionLayout } from './types';

export const DEFAULT_SECTION_LAYOUT: SectionLayout = {
  mode: { desktop: 'block', tablet: 'block', mobile: 'block' },
  gap: { desktop: '0px', tablet: '0px', mobile: '0px' },
  rowGap: { desktop: '0px', tablet: '0px', mobile: '0px' },
  columnGap: { desktop: '0px', tablet: '0px', mobile: '0px' },
  flexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
  flexWrap: { desktop: 'nowrap', tablet: 'wrap', mobile: 'wrap' },
  justifyContent: { desktop: 'flex-start', tablet: 'flex-start', mobile: 'flex-start' },
  alignItems: { desktop: 'stretch', tablet: 'stretch', mobile: 'stretch' },
  alignContent: { desktop: 'stretch', tablet: 'stretch', mobile: 'stretch' },
  gridColumns: { desktop: 12, tablet: 6, mobile: 1 },
  gridRows: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
  gridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
};

export const DEFAULT_LAYOUT_ITEM: LayoutItem = {
  flexGrow: { desktop: 0, tablet: 0, mobile: 0 },
  flexShrink: { desktop: 1, tablet: 1, mobile: 1 },
  flexBasis: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
  alignSelf: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
  order: { desktop: 0, tablet: 0, mobile: 0 },
  columnSpan: { desktop: 1, tablet: 1, mobile: 1 },
  rowSpan: { desktop: 1, tablet: 1, mobile: 1 },
  columnStart: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
  rowStart: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
};
