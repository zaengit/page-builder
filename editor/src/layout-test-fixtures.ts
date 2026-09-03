import type { PageBlock } from './types';

export const gridFixture: PageBlock = {
  id: 'section-grid', type: 'container', attrs: {},
  layout: { mode: { desktop: 'grid', tablet: 'grid', mobile: 'flex' }, gridColumns: { desktop: 4, tablet: 2, mobile: 1 }, flexDirection: { mobile: 'column' }, gap: { desktop: '24px', tablet: '16px', mobile: '12px' } },
  children: [
    { id: 'a', type: 'heading', attrs: {}, layoutItem: { columnSpan: { desktop: 2, tablet: 1, mobile: 1 }, rowSpan: { desktop: 1 } } },
    { id: 'b', type: 'image', attrs: {}, layoutItem: { columnSpan: { desktop: 1, tablet: 1, mobile: 1 }, rowSpan: { desktop: 2 } } },
  ],
};
