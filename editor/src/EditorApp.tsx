import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronLeft, ClipboardPaste, Copy, Laptop, Monitor, MoreHorizontal, PanelLeft, PanelRight, Redo2, Save, Settings2, Smartphone, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

function InspectorPanel({ selected, definition, onChange, requestMedia }: { selected: PageBlock | null; definition?: BlockDefinition; onChange: (id: string, patch: Record<string, unknown>) => void; requestMedia?: (path: string[]) => void }) {
  return <Card className="h-full min-h-0 gap-0 overflow-hidden rounded-none border-0 shadow-none lg:rounded-xl lg:border lg:shadow-sm">
    <CardHeader className="border-b py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1"><CardTitle className="truncate text-base">{definition?.title ?? 'Section settings'}</CardTitle><CardDescription>Section inspector</CardDescription></div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Inspector actions"><MoreHorizontal /></Button>
      </div>
    </CardHeader>
    <ScrollArea className="min-h-0 flex-1">
      {selected && definition ? <div>
        {definition.description && <><div className="px-4 py-4 text-sm text-muted-foreground">{definition.description}</div><Separator /></>}
        <div className="space-y-5 p-4">
          {Object.entries(definition.attributes).map(([name, schema], index, all) => <div key={name} className="space-y-5"><Control name={name} path={[name]} schema={schema} value={selected.attrs[name]} onChange={value => onChange(selected.id, { [name]: value })} requestMedia={requestMedia} />{index < all.length - 1 && <Separator />}</div>)}
        </div>
      </div> : <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center"><Button type="button" variant="secondary" size="icon-lg" disabled><Settings2 /></Button><div className="space-y-1"><p className="text-sm font-medium">Select a section</p><p className="max-w-52 text-sm text-muted-foreground">Choose a section from the page tree or click it in the preview.</p></div></div>}
    </ScrollArea>
  </Card>;
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

  const blocksPanel = <Card className="h-full min-h-0 gap-0 overflow-hidden rounded-none border-0 shadow-none lg:rounded-xl lg:border lg:shadow-sm">
    <CardHeader className="border-b py-4"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><CardTitle className="text-base">Home page</CardTitle><CardDescription>Page structure</CardDescription></div><Badge variant="secondary">{content.blocks.length}</Badge></div></CardHeader>
    <ScrollArea className="min-h-0 flex-1"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SectionTree blocks={content.blocks} definitions={definitions} selectedId={selectedId} onSelect={select} onRemove={removeBlock} onDuplicate={duplicateBlock} renderAdd={() => <Inserter definitions={definitions.filter(item => !item.name.toLowerCase().includes('footer') && !item.name.toLowerCase().includes('header'))} onAdd={addTopLevel} />} /></DndContext></ScrollArea>
  </Card>;

  const inspectorPanel = <InspectorPanel selected={selected} definition={definition} onChange={updateAttrs} requestMedia={runtime.mediaPicker ? requestMedia : undefined} />;

  if (!ready) return <div className="pb-editor flex min-h-[420px] items-center justify-center bg-muted/30 p-6" role="status"><Card><CardContent className="flex items-center gap-3 pt-6"><span className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary" />Loading page builder…</CardContent></Card></div>;

  return <TooltipProvider><main className="pb-editor flex h-svh min-h-[640px] flex-col overflow-hidden bg-muted/30 text-foreground">
    <header className="flex h-14 shrink-0 items-center gap-1 border-b bg-background px-2 sm:px-3">
      <ActionButton label="Back" onClick={() => history.back()}><ChevronLeft /></ActionButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open page structure"><PanelLeft /></Button></SheetTrigger><SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Page structure</SheetTitle><SheetDescription>Sections and blocks</SheetDescription></SheetHeader>{blocksPanel}</SheetContent></Sheet>
      <div className="hidden items-center gap-1 sm:flex"><Button type="button" variant="secondary" size="icon-sm" aria-label="Page structure"><PanelLeft /></Button><ActionButton label="Theme settings" onClick={() => undefined}><Settings2 /></ActionButton></div>

      <Button type="button" variant="ghost" className="mx-auto min-w-0"><Laptop /><span className="max-w-[180px] truncate">Home page</span><ChevronDown /></Button>

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-0.5 sm:flex"><ActionButton label="Undo" disabled={!past.length} onClick={undo}><Undo2 /></ActionButton><ActionButton label="Redo" disabled={!future.length} onClick={redo}><Redo2 /></ActionButton></div>
        <ToggleGroup type="single" variant="outline" size="sm" value={viewport} onValueChange={value => value && setViewport(value as Viewport)} aria-label="Preview viewport">
          <ToggleGroupItem value="desktop" aria-label="Desktop preview"><Monitor /></ToggleGroupItem><ToggleGroupItem value="mobile" aria-label="Mobile preview"><Smartphone /></ToggleGroupItem>
        </ToggleGroup>
        <div className="hidden items-center gap-1 md:flex"><ActionButton label="Copy block" disabled={!selected} onClick={copySelected}><Copy /></ActionButton><ActionButton label="Paste block" disabled={!clipboard && !navigator.clipboard} onClick={paste}><ClipboardPaste /></ActionButton><Button type="button" variant="ghost" size="icon-sm" aria-label="More actions"><MoreHorizontal /></Button></div>
        <Button type="button" size="sm" disabled={!dirty} onClick={save} className="ml-1">{dirty ? <Save /> : <Check />}{dirty ? 'Save' : 'Saved'}</Button>
        <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open inspector"><PanelRight /></Button></SheetTrigger><SheetContent side="right" className="w-[88vw] gap-0 p-0 sm:max-w-sm"><SheetHeader className="sr-only"><SheetTitle>Inspector</SheetTitle><SheetDescription>Section settings</SheetDescription></SheetHeader>{inspectorPanel}</SheetContent></Sheet>
      </div>
    </header>

    {error && <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">{error}</div>}

    <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-0 lg:grid-cols-[288px_minmax(0,1fr)_304px] lg:p-3">
      <aside aria-label="Page structure" className="hidden min-h-0 lg:block">{blocksPanel}</aside>
      <Card className="min-h-0 gap-0 overflow-hidden rounded-none border-0 bg-muted/40 py-0 shadow-none lg:rounded-xl lg:border lg:shadow-sm">
        <CardContent className="min-h-0 flex-1 overflow-auto p-3 lg:p-6">
          <div className="flex min-h-full items-start justify-center">
            <Card className={viewport === 'mobile' ? 'w-full max-w-[390px] overflow-hidden py-0' : 'w-full max-w-[1440px] overflow-hidden py-0'}>
              <iframe ref={iframe} src={runtime.previewUrl} title="Page builder preview" className="block h-[calc(100svh-94px)] min-h-[560px] w-full bg-background" />
            </Card>
          </div>
        </CardContent>
      </Card>
      <aside aria-label="Section inspector" className="hidden min-h-0 lg:block">{inspectorPanel}</aside>
    </section>
  </main></TooltipProvider>;
}
