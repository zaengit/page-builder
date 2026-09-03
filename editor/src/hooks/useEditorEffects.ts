import { useEffect, useMemo, type MutableRefObject } from 'react';
import { createHttpHostAdapter, type EditorHostAdapter } from '../host-adapter';
import type { EditorRuntime, PageBlock, PageContent } from '../types';

type MediaRequest = { id: string; path: string[] } | null;
type MessageActions = { replaceContent: (content: PageContent) => void; select: (id: string | null) => void; updateAttrPath: (id: string, path: string[], value: unknown) => void; duplicateBlock: (id: string) => void; removeBlock: (id: string) => void; };

export function useEditorMessages(mediaRequest: MutableRefObject<MediaRequest>, actions: MessageActions) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === 'SELECT_BLOCK') actions.select(event.data.blockId);
      if (event.data?.type === 'PB_INLINE_EDIT' && event.data.blockId && event.data.attribute) actions.updateAttrPath(event.data.blockId, [event.data.attribute], event.data.value);
      if (event.data?.type === 'PB_TOOLBAR_ACTION' && event.data.blockId) {
        if (event.data.action === 'duplicate') actions.duplicateBlock(event.data.blockId);
        if (event.data.action === 'remove') actions.removeBlock(event.data.blockId);
      }
      if (event.data?.type === 'SET_PAGE_BUILDER_CONTENT' && event.data.content) actions.replaceContent(event.data.content as PageContent);
      if (event.data?.type === 'PAGE_BUILDER_MEDIA_SELECTED' && mediaRequest.current && event.data.url) { actions.updateAttrPath(mediaRequest.current.id, mediaRequest.current.path, event.data.url); mediaRequest.current = null; }
    };
    addEventListener('message', listener); return () => removeEventListener('message', listener);
  }, [actions.duplicateBlock, actions.removeBlock, actions.replaceContent, actions.select, actions.updateAttrPath, mediaRequest]);
}

export function useEditorShortcuts(selectedId: string | null, undo: () => void, redo: () => void, duplicateBlock: (id: string) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input,textarea,[contenteditable="true"]')) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo(); }
      else if (key === 'd' && selectedId) { event.preventDefault(); duplicateBlock(selectedId); }
    };
    addEventListener('keydown', listener); return () => removeEventListener('keydown', listener);
  }, [duplicateBlock, redo, selectedId, undo]);
}

export function usePreview(content: PageContent, ready: boolean, runtime: EditorRuntime, iframe: MutableRefObject<HTMLIFrameElement | null>, setError: (message: string) => void) {
  const host = useMemo<EditorHostAdapter>(() => {
    const supplied = (runtime as EditorRuntime & { hostAdapter?: EditorHostAdapter }).hostAdapter;
    return supplied ?? createHttpHostAdapter(runtime);
  }, [runtime]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      try {
        const result = await host.renderPage(content, runtime.previewContext ?? {});
        setError('');
        iframe.current?.contentWindow?.postMessage({ type: 'REPLACE_PAGE', html: result.html, assets: result.assets, settings: content.settings, diagnostics: result.diagnostics ?? [] }, location.origin);
      } catch (error) { setError(error instanceof Error ? error.message : 'Preview failed'); }
    }, 120);
    return () => clearTimeout(timer);
  }, [content, host, iframe, ready, runtime.previewContext, setError]);
}

export function useChangeEmitter(root: HTMLElement, content: PageContent, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    root.dispatchEvent(new CustomEvent('page-builder:change', { detail: { content }, bubbles: true }));
    root.dispatchEvent(new CustomEvent('page-builder:dirty', { detail: { content }, bubbles: true }));
    if (window.parent !== window) window.parent.postMessage({ type: 'PAGE_BUILDER_CHANGE', content }, location.origin);
  }, [content, ready, root]);
}

export function useAutosave(root: HTMLElement, content: PageContent, dirty: boolean, ready: boolean, delay = 0) {
  useEffect(() => {
    if (!ready || !dirty || delay <= 0) return;
    const timer = setTimeout(() => {
      root.dispatchEvent(new CustomEvent('page-builder:save-request', { detail: { content, autosave: true }, bubbles: true }));
      if (window.parent !== window) window.parent.postMessage({ type: 'PAGE_BUILDER_SAVE_REQUEST', content, autosave: true }, location.origin);
    }, delay);
    return () => clearTimeout(timer);
  }, [content, delay, dirty, ready, root]);
}

export async function readClipboardBlock(fallback: PageBlock | null): Promise<PageBlock | null> {
  let block = fallback;
  try { const text = await navigator.clipboard?.readText(); if (text) { const parsed = JSON.parse(text); if (parsed?.pageBuilderBlock) block = parsed.pageBuilderBlock as PageBlock; } } catch { /* optional clipboard permission */ }
  return block;
}
