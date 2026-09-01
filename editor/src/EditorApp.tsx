import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ClipboardPaste, Copy, Layers3, Monitor, PanelLeft, PanelRight, Redo2, Settings2, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Control } from './components/Controls';
import { Inserter } from './components/Inserter';
import { Tree } from './components/Tree';
import { readClipboardBlock, useChangeEmitter, useEditorMessages, useEditorShortcuts, usePreview } from './hooks/useEditorEffects';
import { createBuilderStore, findBlock } from './store';
import type { BlockDefinition, EditorRuntime, PageBlock, PageContent } from './types';

type Props = { root: HTMLElement; runtime: EditorRuntime; initial: PageContent };
type Viewport = 'desktop' | 'tablet' | 'mobile';

type PanelShellProps = {
  title: string;
  icon: ReactNode;
  description?: string;
  children: ReactNode;
};

function PanelShell({ title, icon, description, children }: PanelShellProps) {
  return <div className="flex h-full min-h-0 flex-col bg-background"><div className="border-b px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>{description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}</div><ScrollArea className="min-h-0 flex-1"><div className="grid gap-4 p-4">{children}</div></ScrollArea></div>;
}

function InspectorPanel({ selected, definition, onChange, requestMedia }: { selected: PageBlock | null; definition?: BlockDefinition; onChange: (id: string, patch: Record<string, unknown>) => void; requestMedia?: (path: string[]) => void }) {
  return <PanelShell title="Inspector" icon={<Settings2 className="size-4" />} description="Configure the selected block and its content.">{selected && definition ? <><div className="rounded-lg border bg-muted/30 p-3"><p className="text-sm font-semibold">{definition.title}</p>{definition.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition.description}</p>}</div>{Object.entries(definition.attributes).map(([name, schema]) => <Control key={name} name={name} path={[name]} schema={schema} value={selected.attrs[name]} onChange={value => onChange(selected.id, { [name]: value })} requestMedia={requestMedia} />)}</> : <div className="rounded-xl border border-dashed p-8 text-center"><Settings2 className="mx-auto mb-3 size-8 text-muted-foreground/60" /><p className="text-sm font-medium">No block selected</p><p className="mt-1 text-xs text-muted-foreground">Select a block from the layers panel to edit it.</p></div>}</PanelShell>;
}

function ActionButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={onClick} aria-label={label}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export function EditorApp({ root, runtime, initial }: Props) {
  const [useBuilder] = useState(() => createBuilderStore());
  const { content, definitions, selectedId, dirty, past, future, bootstrap, replaceContent, select, addBlock, insertBlock, duplicateBlock, updateAttrs, updateAttrPath, moveBlock, removeBlock, undo, redo } = useBuilder();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [clipboard, setClipboard] = useState<PageBlock | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
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

  const blocksPanel = <PanelShell title="Blocks" icon={<Layers3 className="size-4" />} description="Build the page structure and reorder blocks."><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><Tree blocks={content.blocks} definitions={definitions} selectedId={selectedId} onSelect={select} onRemove={removeBlock} onDuplicate={duplicateBlock} /></DndContext><Separator /><Inserter definitions={definitions} onAdd={(type, variation) => addBlock(type, selected && definition?.supports?.children ? selected.id : null, variation)} /></PanelShell>;
  const inspectorPanel = <InspectorPanel selected={selected} definition={definition} onChange={updateAttrs} requestMedia={runtime.mediaPicker ? requestMedia : undefined} />;

  if (!ready) return <div className="pb-editor flex min-h-[420px] items-center justify-center" role="status"><div className="flex items-center gap-3 rounded-xl border bg-background px-5 py-4 text-sm shadow-sm"><span className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" /> Loading page builder…</div></div>;

  return <TooltipProvider><main className="pb-editor flex h-svh min-h-[640px] flex-col overflow-hidden">
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur sm:px-3">
      <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open blocks panel"><PanelLeft /></Button></SheetTrigger><SheetContent side="left" className="w-[88vw] p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Blocks</SheetTitle><SheetDescription>Page blocks and inserter</SheetDescription></SheetHeader>{blocksPanel}</SheetContent></Sheet>
      <div className="flex min-w-0 items-center gap-2"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"><Layers3 className="size-4" /></div><div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-semibold leading-none">Page Builder</p><p className="mt-1 text-[11px] text-muted-foreground">Visual editor</p></div></div>
      <Badge variant={dirty ? 'secondary' : 'outline'} className="ml-1 hidden sm:inline-flex" aria-live="polite">{dirty ? 'Modified' : 'Saved'}</Badge>
      <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
      <div className="hidden items-center gap-0.5 sm:flex"><ActionButton label="Undo" disabled={!past.length} onClick={undo}><Undo2 /></ActionButton><ActionButton label="Redo" disabled={!future.length} onClick={redo}><Redo2 /></ActionButton></div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ToggleGroup type="single" value={viewport} onValueChange={value => value && setViewport(value as Viewport)} aria-label="Preview viewport">
          <ToggleGroupItem value="desktop" aria-label="Desktop preview"><Monitor /></ToggleGroupItem>
          <ToggleGroupItem value="tablet" aria-label="Tablet preview" className="hidden sm:inline-flex"><Tablet /></ToggleGroupItem>
          <ToggleGroupItem value="mobile" aria-label="Mobile preview"><Smartphone /></ToggleGroupItem>
        </ToggleGroup>
        <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
        <div className="hidden items-center gap-0.5 md:flex"><ActionButton label="Copy block" disabled={!selected} onClick={copySelected}><Copy /></ActionButton><ActionButton label="Paste block" disabled={!clipboard && !navigator.clipboard} onClick={paste}><ClipboardPaste /></ActionButton><ActionButton label="Duplicate block" disabled={!selectedId} onClick={() => selectedId && duplicateBlock(selectedId)}><Copy className="stroke-[2.5]" /></ActionButton></div>
        <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open inspector panel"><PanelRight /></Button></SheetTrigger><SheetContent side="right" className="w-[88vw] p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Inspector</SheetTitle><SheetDescription>Block settings</SheetDescription></SheetHeader>{inspectorPanel}</SheetContent></Sheet>
      </div>
    </header>
    {error && <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">{error}</div>}
    <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside aria-label="Block tree" className="hidden min-h-0 border-r lg:block">{blocksPanel}</aside>
      <div className="canvas-grid min-h-0 overflow-auto p-3 sm:p-5 lg:p-7">
        <div className="mx-auto flex min-h-full items-start justify-center">
          <div className="preview-device overflow-hidden rounded-xl border bg-background shadow-[0_14px_50px_rgba(0,0,0,0.12)]" data-viewport={viewport}>
            <div className="flex h-8 items-center gap-1.5 border-b bg-muted/40 px-3"><span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" /><div className="mx-auto rounded-md bg-background px-3 py-0.5 text-[10px] text-muted-foreground shadow-xs">{viewport}</div></div>
            <iframe ref={iframe} src={runtime.previewUrl} title="Page builder preview" className="block h-[calc(100svh-9rem)] min-h-[520px] w-full bg-white sm:h-[calc(100svh-10rem)]" />
          </div>
        </div>
      </div>
      <aside aria-label="Block inspector" className="hidden min-h-0 border-l lg:block">{inspectorPanel}</aside>
    </section>
  </main></TooltipProvider>;
}
