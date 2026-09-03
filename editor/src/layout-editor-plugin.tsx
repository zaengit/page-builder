import { useEffect } from 'react';
import type { Breakpoint, PageBlock, PageContent } from './types';
import { EventLayoutItemInspector, EventSectionLayoutInspector } from './layout-events';
import { installLayoutRuntime } from './layout-runtime';

export function LayoutInspectorPanels({ selected, blocks, breakpoint }: { selected: PageBlock; blocks: PageBlock[]; breakpoint: Breakpoint }) {
  return <>
    {selected.children !== undefined && <div className="space-y-3 p-3"><p className="text-[11px] font-semibold">Layout · {breakpoint}</p><EventSectionLayoutInspector block={selected} breakpoint={breakpoint} /></div>}
    <div className="p-3"><EventLayoutItemInspector block={selected} allBlocks={blocks} breakpoint={breakpoint} /></div>
  </>;
}

export function useLayoutRuntimeBridge({ content, breakpoint, previewDocument, replaceContent }: { content: PageContent; breakpoint: Breakpoint; previewDocument: () => Document | null | undefined; replaceContent: (content: PageContent) => void }) {
  useEffect(() => {
    const runtime = installLayoutRuntime({
      getContent: () => content,
      replaceBlocks: blocks => replaceContent({ ...content, blocks }),
      getPreviewDocument: previewDocument,
      getBreakpoint: () => breakpoint,
    });
    runtime.refresh();
    return () => runtime.destroy();
  }, [content, breakpoint, previewDocument, replaceContent]);
}
