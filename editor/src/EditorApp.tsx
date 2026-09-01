import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronLeft, ClipboardPaste, Copy, Laptop, Monitor, MoreHorizontal, PanelLeft, PanelRight, Redo2, Save, Settings2, Smartphone, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Control } from './components/Controls';
import { Inserter } from './components/Inserter';
import { SectionTree } from './components/Tree';
import { readClipboardBlock, useChangeEmitter, useEditorMessages, useEditorShortcuts, usePreview } from './hooks/useEditorEffects';
import { createBuilderStore, findBlock } from './store';
import type { BlockDefinition, EditorRuntime, PageBlock, PageContent } from './types';

type Props = { root: HTMLElement; runtime: EditorRuntime; initial: PageContent };
type Viewport = 'desktop' | 'mobile';

type PanelShellProps = { title: string; icon?: ReactNode; children: ReactNode };

function PanelShell({ title, icon, children }: PanelShellProps) {
  return <div className="flex h-full min-h-0 flex-col bg-white"><div className="flex h-10 shrink-0 items-center gap-2 border-b px-3"><span className="text-muted-foreground">{icon}</span><span className="truncate text-sm font-semibold">{title}</span></div><ScrollArea className="min-h-0 flex-1">{children}</ScrollArea></div>;
}

function InspectorPanel({ selected, definition, onChange, requestMedia, onClose }: { selected: PageBlock | null; definition?: BlockDefinition; onChange: (id: string, patch: Record<string, unknown>) => void; requestMedia?: (path: string[]) => void; onClose?: () => void }) {
  return <div className="flex h-full min-h-0 flex-col bg-white">
    <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3"><Settings2 className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{definition?.title ?? 'Section settings'}</span><Button type="button" variant="ghost" size="icon-sm" className="size-7"><MoreHorizontal className="size-4" /></Button>{onClose && <Button type="button" variant="ghost" size="icon-sm" className="size-7 lg:hidden" onClick={onClose} aria-label="Close inspector">×</Button>}</div>
    <ScrollArea className="min-h-0 flex-1"><div className="grid gap-0">
      {selected && definition ? <>
        {definition.description && <div className="border-b bg-[#f8f8f8] px-4 py-3 text-xs leading-relaxed text-muted-foreground">{definition.description}</div>}
        <div className="grid gap-4 px-4 py-4">{Object.entries(definition.attributes).map(([name, schema]) => <Control key={name} name={name} path={[name]} schema={schema} value={selected.attrs[name]} onChange={value => onChange(selected.id, { [name]: value })} requestMedia={requestMedia} />)}</div>
      </> : <div className="m-4 rounded-lg border border-dashed p-8 text-center"><Settings2 className="mx-auto mb-3 size-7 text-muted-foreground/60" /><p className="text-sm font-medium">Select a section</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose a section or block from the page tree or click it in the preview.</p></div>}
    </div></ScrollArea>
  </div>;
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
    bootstrap(runtime, initial).then(() => { if (active) setReady(true); }).catch(reason => { if (!active) return; setError(reason instanceof Error ? reason.message : 'Failed to load builder'); setReady(true); });
    return () => { active = false; };
  }, [bootstrap, initial, runtime]);

  useEditorMessages(mediaRequest, { replaceContent, select, updateAttrPath });
  useEditorShortcuts(selectedId, undo, redo, duplicateBlock);
  usePreview(content, ready, runtime, iframe, setError);
  useChangeEmitter(root, content, ready);

  useEffect(() => {
    if (!ready || !selectedId) return;
    iframe.current?.contentWindow?.postMessage({ type: 'PB_EDITOR_SELECTION', blockId: selectedId }, location.origin);
  }, [ready, selectedId]);

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

  const save = () => {
    const detail = { content };
    root.dispatchEvent(new CustomEvent('page-builder:save', { detail, bubbles: true }));
    if (window.parent !== window) window.parent.postMessage({ type: 'PAGE_BUILDER_SAVE', content }, location.origin);
  };

  const addTopLevel = (type: string, variation?: Parameters<typeof addBlock>[2]) => addBlock(type, null, variation);

  const blocksPanel = <PanelShell title="Home page">
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SectionTree blocks={content.blocks} definitions={definitions} selectedId={selectedId} onSelect={select} onRemove={removeBlock} onDuplicate={duplicateBlock} renderAdd={() => <Inserter definitions={definitions.filter(item => !item.name.toLowerCase().includes('footer') && !item.name.toLowerCase().includes('header'))} onAdd={addTopLevel} />} />
    </DndContext>
  </PanelShell>;

  const inspectorPanel = <InspectorPanel selected={selected} definition={definition} onChange={updateAttrs} requestMedia={runtime.mediaPicker ? requestMedia : undefined} />;

  if (!ready) return <div className="pb-editor flex min-h-[420px] items-center justify-center" role="status"><div className="flex items-center gap-3 rounded-lg border bg-white px-5 py-4 text-sm shadow-sm"><span className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" /> Loading page builder…</div></div>;

  return <TooltipProvider><main className="pb-editor flex h-svh min-h-[640px] flex-col overflow-hidden">
    <header className="z-30 flex h-[60px] shrink-0 items-center gap-1 border-b bg-white px-2 sm:px-3">
      <ActionButton label="Back" onClick={() => history.back()}><ChevronLeft /></ActionButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open page structure"><PanelLeft /></Button></SheetTrigger><SheetContent side="left" className="w-[88vw] p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Page structure</SheetTitle><SheetDescription>Sections and blocks</SheetDescription></SheetHeader>{blocksPanel}</SheetContent></Sheet>
      <div className="hidden items-center gap-1 sm:flex"><Button type="button" variant="ghost" size="icon-sm" className="bg-[#eaf4ff] text-[#005bd3]"><PanelLeft /></Button><ActionButton label="Theme settings" onClick={() => undefined}><Settings2 /></ActionButton></div>
      <div className="mx-auto flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[#f1f2f3]"><Laptop className="size-4 text-muted-foreground" /><span className="max-w-[180px] truncate">Home page</span><ChevronDown className="size-3.5 text-muted-foreground" /></div>
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-0.5 sm:flex"><ActionButton label="Undo" disabled={!past.length} onClick={undo}><Undo2 /></ActionButton><ActionButton label="Redo" disabled={!future.length} onClick={redo}><Redo2 /></ActionButton></div>
        <ToggleGroup type="single" value={viewport} onValueChange={value => value && setViewport(value as Viewport)} aria-label="Preview viewport" className="hidden sm:flex">
          <ToggleGroupItem value="desktop" aria-label="Desktop preview"><Monitor /></ToggleGroupItem><ToggleGroupItem value="mobile" aria-label="Mobile preview"><Smartphone /></ToggleGroupItem>
        </ToggleGroup>
        <ActionButton label="Copy block" disabled={!selected} onClick={copySelected}><Copy /></ActionButton>
        <ActionButton label="Paste block" disabled={!clipboard && !navigator.clipboard} onClick={paste}><ClipboardPaste /></ActionButton>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions"><MoreHorizontal /></Button>
        <Button type="button" size="sm" disabled={!dirty} onClick={save} className="ml-1 gap-1.5 px-3">{dirty ? <Save className="size-4" /> : <Check className="size-4" />}{dirty ? 'Save' : 'Saved'}</Button>
        <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open inspector"><PanelRight /></Button></SheetTrigger><SheetContent side="right" className="w-[88vw] p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Inspector</SheetTitle><SheetDescription>Section settings</SheetDescription></SheetHeader>{inspectorPanel}</SheetContent></Sheet>
      </div>
    </header>
    {error && <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">{error}</div>}
    <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      <aside aria-label="Page structure" className="relative hidden min-h-0 border-r bg-white lg:block">{blocksPanel}</aside>
      <div className="pb-preview-workspace min-h-0 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-0 sm:p-3">
          <div className="pb-preview-device bg-white" data-viewport={viewport}>
            <iframe ref={iframe} src={runtime.previewUrl} title="Page builder preview" className="block h-[calc(100svh-60px)] min-h-[560px] w-full bg-white sm:h-[calc(100svh-84px)]" />
          </div>
        </div>
      </div>
      <aside aria-label="Section inspector" className="hidden min-h-0 border-l bg-white lg:block">{inspectorPanel}</aside>
    </section>
  </main></TooltipProvider>;
}
