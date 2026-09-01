import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Control } from './components/Controls';
import { Inserter } from './components/Inserter';
import { Tree } from './components/Tree';
import { readClipboardBlock, useChangeEmitter, useEditorMessages, useEditorShortcuts, usePreview } from './hooks/useEditorEffects';
import { createBuilderStore, findBlock } from './store';
import type { EditorRuntime, PageBlock, PageContent } from './types';

type Props = { root: HTMLElement; runtime: EditorRuntime; initial: PageContent };

export function EditorApp({ root, runtime, initial }: Props) {
  const [useBuilder] = useState(() => createBuilderStore());
  const { content, definitions, selectedId, dirty, past, future, bootstrap, replaceContent, select, addBlock, insertBlock, duplicateBlock, updateAttrs, updateAttrPath, moveBlock, removeBlock, undo, redo } = useBuilder();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [clipboard, setClipboard] = useState<PageBlock | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const mediaRequest = useRef<{ id: string; path: string[] } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const selected = useMemo(() => findBlock(content.blocks, selectedId), [content.blocks, selectedId]);
  const definition = definitions.find(item => item.name === selected?.type);

  useEffect(() => {
    let active = true;
    bootstrap(runtime, initial)
      .then(() => { if (active) setReady(true); })
      .catch(reason => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Failed to load builder');
        setReady(true);
      });
    return () => { active = false; };
  }, [bootstrap, initial, runtime]);

  useEditorMessages(mediaRequest, { replaceContent, select, updateAttrPath });
  useEditorShortcuts(selectedId, undo, redo, duplicateBlock);
  usePreview(content, ready, runtime, iframe, setError);
  useChangeEmitter(root, content, ready);

  const onDragEnd = ({ active, over }: DragEndEvent) => { if (over && active.id !== over.id) moveBlock(String(active.id), String(over.id)); };

  const copySelected = async () => {
    if (!selected) return;
    const copy = structuredClone(selected);
    setClipboard(copy);
    await navigator.clipboard?.writeText(JSON.stringify({ pageBuilderBlock: copy }));
  };

  const paste = async () => {
    const block = await readClipboardBlock(clipboard);
    if (block) insertBlock(block, selected && definition?.supports?.children ? selected.id : null);
  };

  const requestMedia = (path: string[]) => {
    if (!selected) return;
    mediaRequest.current = { id: selected.id, path };
    const detail = { blockId: selected.id, path, value: path.reduce<unknown>((current, segment) => Array.isArray(current) ? current[Number(segment)] : current && typeof current === 'object' ? (current as Record<string, unknown>)[segment] : undefined, selected.attrs) };
    root.dispatchEvent(new CustomEvent('page-builder:media-request', { detail, bubbles: true }));
    if (window.parent !== window) window.parent.postMessage({ type: 'PAGE_BUILDER_MEDIA_REQUEST', ...detail }, location.origin);
  };

  if (!ready) return <div className="loading" role="status">Loading page builder…</div>;

  return <main className="pb-editor"><header><strong>Page Builder</strong><span className={dirty ? 'dirty' : ''} aria-live="polite">{dirty ? 'Modified' : 'Ready'}</span><div className="history-controls"><button type="button" disabled={!past.length} onClick={undo}>Undo</button><button type="button" disabled={!future.length} onClick={redo}>Redo</button></div><button type="button" disabled={!selected} onClick={copySelected}>Copy</button><button type="button" disabled={!clipboard && !navigator.clipboard} onClick={paste}>Paste</button><button type="button" disabled={!selectedId} onClick={() => selectedId && duplicateBlock(selectedId)}>Duplicate</button></header>{error && <div className="builder-error" role="alert">{error}</div>}<section className="layout"><aside aria-label="Block tree"><h3>Blocks</h3><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><Tree blocks={content.blocks} definitions={definitions} selectedId={selectedId} onSelect={select} onRemove={removeBlock} onDuplicate={duplicateBlock} /></DndContext><Inserter definitions={definitions} onAdd={(type, variation) => addBlock(type, selected && definition?.supports?.children ? selected.id : null, variation)} /></aside><div className="preview"><iframe ref={iframe} src={runtime.previewUrl} title="Page builder preview" /></div><aside aria-label="Block inspector"><h3>Inspector</h3>{selected && definition ? <><div className="inspector-title">{definition.title}</div>{definition.description && <p className="muted">{definition.description}</p>}{Object.entries(definition.attributes).map(([name, schema]) => <Control key={name} name={name} path={[name]} schema={schema} value={selected.attrs[name]} onChange={value => updateAttrs(selected.id, { [name]: value })} requestMedia={runtime.mediaPicker ? requestMedia : undefined} />)}</> : <p>Select a block</p>}</aside></section></main>;
}
