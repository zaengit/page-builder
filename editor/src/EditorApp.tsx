import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardPaste,
  Copy,
  Download,
  Laptop,
  Lock,
  Monitor,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Redo2,
  Save,
  Settings2,
  Smartphone,
  Tablet,
  Undo2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Control } from './components/Controls';
import { Inserter } from './components/Inserter';
import { SectionTree } from './components/Tree';
import {
  readClipboardBlock,
  useAutosave,
  useChangeEmitter,
  useEditorMessages,
  useEditorShortcuts,
  usePreview,
} from './hooks/useEditorEffects';
import {
  getBlockEditor,
  getInspectorPanels,
  getRegisteredPatterns,
  getToolbarActions,
  getTransforms,
} from './registry';
import { createBuilderStore, findBlock } from './store';
import type {
  BlockDefinition,
  BlockStyle,
  Breakpoint,
  EditorRuntime,
  PageBlock,
  PageContent,
  PageSettings,
  Pattern,
} from './types';

type Props = {
  root: HTMLElement;
  runtime: EditorRuntime;
  initial: PageContent;
};

function styleValue(block: PageBlock, key: keyof BlockStyle, breakpoint: Breakpoint): string {
  const value = block.styles?.[key];

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String((value as Record<string, unknown>)[breakpoint] ?? '');
  }

  return String(value ?? '');
}

function InspectorPanel({
  selected,
  definition,
  breakpoint,
  runtime,
  onChange,
  onStyle,
  onBindings,
  onLock,
  requestMedia,
}: {
  selected: PageBlock | null;
  definition?: BlockDefinition;
  breakpoint: Breakpoint;
  runtime: EditorRuntime;
  onChange: (id: string, patch: Record<string, unknown>) => void;
  onStyle: (id: string, patch: Partial<BlockStyle>) => void;
  onBindings: (id: string, bindings: PageBlock['bindings']) => void;
  onLock: (id: string, lock: NonNullable<PageBlock['lock']>) => void;
  requestMedia?: (path: string[]) => void;
}) {
  const transforms = selected ? getTransforms(selected.type) : [];
  const extensions = getInspectorPanels();
  const CustomEditor = selected ? getBlockEditor(selected.type) : undefined;
  const binding = selected ? Object.entries(selected.bindings ?? {})[0] : undefined;
  const styleKeys: Array<keyof BlockStyle> = [
    'background',
    'color',
    'padding',
    'margin',
    'gap',
    'width',
    'fontSize',
    'borderRadius',
    'boxShadow',
  ];

  return (
    <Card className="h-full min-h-0 gap-0 overflow-hidden rounded-none border-0 shadow-none lg:rounded-lg lg:border lg:shadow-sm">
      <CardHeader className="border-b px-2 py-1">
        <div className="flex h-6 items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <CardTitle className="truncate text-[11px] leading-none">
              {definition?.title ?? 'Block settings'}
            </CardTitle>
            <CardDescription className="truncate text-[9px] leading-none">Inspector</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="icon-xs" className="size-5" aria-label="Inspector options">
            <MoreHorizontal />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="min-h-0 flex-1">
        {selected && definition ? (
          <div className="divide-y">
            {CustomEditor ? (
              <div className="p-3">
                <CustomEditor
                  block={selected}
                  definition={definition}
                  updateAttrs={attrs => onChange(selected.id, attrs)}
                />
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {definition.description && (
                  <p className="text-xs text-muted-foreground">{definition.description}</p>
                )}
                {Object.entries(definition.attributes).map(([name, schema]) => (
                  <Control
                    key={name}
                    name={name}
                    path={[name]}
                    schema={schema}
                    value={selected.attrs[name]}
                    attrs={selected.attrs}
                    breakpoint={breakpoint}
                    onChange={value => onChange(selected.id, { [name]: value })}
                    requestMedia={requestMedia}
                  />
                ))}
              </div>
            )}

            {definition.supports?.styles !== false && (
              <div className="space-y-3 p-3">
                <p className="text-[11px] font-semibold">Design · {breakpoint}</p>
                {styleKeys.map(key => (
                  <div key={key} className="grid gap-1">
                    <Label className="text-[11px] capitalize">{key}</Label>
                    <Input
                      className="h-7 text-xs"
                      value={styleValue(selected, key, breakpoint)}
                      onChange={event => {
                        const current = selected.styles?.[key];
                        const responsive = current && typeof current === 'object' && !Array.isArray(current)
                          ? current as Record<string, unknown>
                          : { desktop: current };
                        onStyle(selected.id, {
                          [key]: { ...responsive, [breakpoint]: event.target.value },
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 p-3">
              <p className="text-[11px] font-semibold">Dynamic data</p>
              <Select
                value={binding?.[1].source ?? 'static'}
                onValueChange={value => {
                  if (value === 'static') {
                    onBindings(selected.id, {});
                    return;
                  }

                  onBindings(selected.id, {
                    [binding?.[0] ?? Object.keys(definition.attributes)[0] ?? 'value']: { source: value },
                  });
                }}
              >
                <SelectTrigger size="sm" aria-label="Dynamic data source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  {runtime.dataSources?.map(source => (
                    <SelectItem key={source.name} value={source.name}>{source.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {binding && (
                <Input
                  className="h-7 text-xs"
                  aria-label="Dynamic data path"
                  placeholder="Path e.g. product.title"
                  value={binding[1].path ?? ''}
                  onChange={event => onBindings(selected.id, {
                    ...selected.bindings,
                    [binding[0]]: { ...binding[1], path: event.target.value },
                  })}
                />
              )}
            </div>

            <div className="space-y-3 p-3">
              <p className="text-[11px] font-semibold">Locking</p>
              {(['move', 'remove', 'edit'] as const).map(key => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-xs capitalize">Lock {key}</Label>
                  <Switch
                    size="sm"
                    checked={Boolean(selected.lock?.[key])}
                    onCheckedChange={value => onLock(selected.id, { ...selected.lock, [key]: value })}
                  />
                </div>
              ))}
            </div>

            {transforms.length > 0 && (
              <div className="space-y-2 p-3">
                <p className="text-[11px] font-semibold">Transform</p>
                {transforms.map(transform => (
                  <Button
                    key={transform.name}
                    type="button"
                    size="xs"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.dispatchEvent(new CustomEvent('page-builder:transform-request', {
                      detail: { blockId: selected.id, transform },
                    }))}
                  >
                    {transform.title}
                  </Button>
                ))}
              </div>
            )}

            {extensions.map(extension => {
              const Panel = extension.render;
              return (
                <div key={extension.id} className="p-3">
                  <p className="mb-2 text-[11px] font-semibold">{extension.title}</p>
                  <Panel block={selected} definition={definition} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center gap-2 p-5 text-center">
            <Button type="button" variant="secondary" size="icon" disabled>
              <Settings2 />
            </Button>
            <p className="text-xs text-muted-foreground">Select a block in the preview.</p>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

function PageSettingsPanel({
  settings,
  onChange,
}: {
  settings?: PageSettings;
  onChange: (patch: Partial<PageSettings>) => void;
}) {
  const fields: Array<[keyof PageSettings, string]> = [
    ['contentWidth', 'Content width'],
    ['background', 'Page background'],
    ['customClass', 'Body class'],
    ['customCss', 'Custom CSS'],
  ];

  return (
    <div className="grid gap-3 p-3">
      {fields.map(([key, label]) => (
        <div className="grid gap-1" key={key}>
          <Label className="text-xs">{label}</Label>
          <Input
            className="h-8 text-xs"
            value={String(settings?.[key] ?? '')}
            onChange={event => onChange({ [key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function EditorApp({ root, runtime, initial }: Props) {
  const [useBuilder] = useState(() => createBuilderStore());
  const {
    content,
    definitions,
    selectedId,
    dirty,
    past,
    future,
    bootstrap,
    replaceContent,
    markSaved,
    select,
    addBlock,
    insertBlock,
    insertPattern,
    duplicateBlock,
    updateAttrs,
    updateAttrPath,
    updateStyles,
    updateBindings,
    updateSettings,
    setLock,
    applyTransform,
    moveBlock,
    removeBlock,
    undo,
    redo,
  } = useBuilder();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [clipboard, setClipboard] = useState<PageBlock | null>(null);
  const [viewport, setViewport] = useState<Breakpoint>('desktop');
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const mediaRequest = useRef<{ id: string; path: string[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selected = useMemo(() => findBlock(content.blocks, selectedId), [content.blocks, selectedId]);
  const definition = definitions.find(item => item.name === selected?.type);
  const patterns = [...(runtime.patterns ?? []), ...getRegisteredPatterns()];

  useEffect(() => {
    let active = true;
    bootstrap(runtime, initial)
      .then(() => {
        if (active) setReady(true);
      })
      .catch(reason => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Failed to load builder');
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [bootstrap, initial, runtime]);

  useEditorMessages(mediaRequest, {
    replaceContent,
    select,
    updateAttrPath,
    duplicateBlock,
    removeBlock,
  });
  useEditorShortcuts(selectedId, undo, redo, duplicateBlock);
  usePreview(content, ready, runtime, iframe, setError);
  useChangeEmitter(root, content, ready);
  useAutosave(root, content, dirty, ready, runtime.autosaveMs ?? 0);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.blockId && detail?.transform) applyTransform(detail.blockId, detail.transform);
    };

    addEventListener('page-builder:transform-request', listener);
    return () => removeEventListener('page-builder:transform-request', listener);
  }, [applyTransform]);

  useEffect(() => {
    if (ready && selectedId) {
      iframe.current?.contentWindow?.postMessage(
        { type: 'PB_EDITOR_SELECTION', blockId: selectedId },
        location.origin,
      );
    }
  }, [ready, selectedId]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) moveBlock(String(active.id), String(over.id));
  };

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
    const detail = {
      blockId: selected.id,
      path,
      value: path.reduce<unknown>(
        (current, segment) => Array.isArray(current)
          ? current[Number(segment)]
          : current && typeof current === 'object'
            ? (current as Record<string, unknown>)[segment]
            : undefined,
        selected.attrs,
      ),
    };
    root.dispatchEvent(new CustomEvent('page-builder:media-request', { detail, bubbles: true }));
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'PAGE_BUILDER_MEDIA_REQUEST', ...detail }, location.origin);
    }
  };

  const save = () => {
    root.dispatchEvent(new CustomEvent('page-builder:save-request', {
      detail: { content, autosave: false },
      bubbles: true,
    }));
    root.dispatchEvent(new CustomEvent('page-builder:save', { detail: { content }, bubbles: true }));
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'PAGE_BUILDER_SAVE', content }, location.origin);
    }
    markSaved();
  };

  const exportPage = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'page-builder.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPage = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as PageContent;
      if (!Array.isArray(parsed.blocks)) throw new Error('Invalid page JSON');
      replaceContent(parsed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid page JSON');
    }
  };

  const addTopLevel = (type: string, variation?: Parameters<typeof addBlock>[2]) => {
    addBlock(type, null, variation);
  };

  const blocksPanel = (
    <Card className="h-full min-h-0 gap-0 overflow-hidden rounded-none border-0 shadow-none lg:rounded-lg lg:border lg:shadow-sm">
      <CardHeader className="border-b px-2 py-1">
        <div className="flex h-6 items-center justify-between">
          <div>
            <CardTitle className="text-[11px]">Page structure</CardTitle>
            <CardDescription className="text-[9px]">Blocks, patterns & templates</CardDescription>
          </div>
          <Badge variant="secondary" className="h-4 px-1 text-[9px]">{content.blocks.length}</Badge>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SectionTree
            blocks={content.blocks}
            definitions={definitions}
            selectedId={selectedId}
            onSelect={select}
            onRemove={removeBlock}
            onDuplicate={duplicateBlock}
            renderAdd={() => (
              <div className="grid gap-1">
                <Inserter definitions={definitions} onAdd={addTopLevel} />
                {patterns.map((pattern: Pattern) => (
                  <Button
                    key={pattern.id}
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => insertPattern(pattern)}
                  >
                    {pattern.title}
                  </Button>
                ))}
                {runtime.templates?.map(template => (
                  <Button
                    key={template.id}
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => replaceContent(template.content)}
                  >
                    {template.title}
                  </Button>
                ))}
              </div>
            )}
          />
        </DndContext>
      </ScrollArea>
    </Card>
  );

  const inspectorPanel = pageSettingsOpen ? (
    <Card className="h-full min-h-0 gap-0 overflow-hidden rounded-none border-0 shadow-none lg:rounded-lg lg:border">
      <CardHeader className="border-b px-3 py-2">
        <CardTitle className="text-xs">Page settings</CardTitle>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <PageSettingsPanel settings={content.settings} onChange={updateSettings} />
      </ScrollArea>
    </Card>
  ) : (
    <InspectorPanel
      selected={selected}
      definition={definition}
      breakpoint={viewport}
      runtime={runtime}
      onChange={updateAttrs}
      onStyle={updateStyles}
      onBindings={updateBindings}
      onLock={setLock}
      requestMedia={runtime.mediaPicker ? requestMedia : undefined}
    />
  );

  if (!ready) {
    return (
      <div className="pb-editor flex min-h-[420px] items-center justify-center bg-muted/30 p-4" role="status">
        Loading page builder…
      </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="pb-editor flex h-svh min-h-[600px] flex-col overflow-hidden bg-muted/30 text-foreground">
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={event => void importPage(event.target.files?.[0])}
        />

        <header className="flex h-11 shrink-0 items-center gap-0.5 border-b bg-background px-1.5 sm:px-2">
          <ActionButton label="Back" onClick={() => history.back()}><ChevronLeft /></ActionButton>
          <Separator orientation="vertical" className="mx-1 h-5" />

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="lg:hidden"
                aria-label="Open page structure"
              >
                <PanelLeft />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-xs">
              <SheetHeader className="sr-only">
                <SheetTitle>Page structure</SheetTitle>
                <SheetDescription>Blocks</SheetDescription>
              </SheetHeader>
              {blocksPanel}
            </SheetContent>
          </Sheet>

          <ActionButton label="Page settings" onClick={() => setPageSettingsOpen(value => !value)}>
            <Settings2 />
          </ActionButton>

          <Button type="button" variant="ghost" size="sm" className="mx-auto min-w-0">
            <Laptop />
            <span className="truncate">Page Builder</span>
            <ChevronDown />
          </Button>

          <div className="ml-auto flex items-center gap-0.5">
            <div className="hidden sm:flex">
              <ActionButton label="Undo" disabled={!past.length} onClick={undo}><Undo2 /></ActionButton>
              <ActionButton label="Redo" disabled={!future.length} onClick={redo}><Redo2 /></ActionButton>
            </div>

            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={viewport}
              onValueChange={value => value && setViewport(value as Breakpoint)}
            >
              <ToggleGroupItem value="desktop" aria-label="Desktop preview"><Monitor /></ToggleGroupItem>
              <ToggleGroupItem value="tablet" aria-label="Tablet preview"><Tablet /></ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Mobile preview"><Smartphone /></ToggleGroupItem>
            </ToggleGroup>

            <div className="hidden md:flex">
              <ActionButton label="Copy" disabled={!selected} onClick={copySelected}><Copy /></ActionButton>
              <ActionButton label="Paste" onClick={paste}><ClipboardPaste /></ActionButton>
              <ActionButton label="Import page" onClick={() => fileInput.current?.click()}><Upload /></ActionButton>
              <ActionButton label="Export page" onClick={exportPage}><Download /></ActionButton>
              {selected && getToolbarActions(selected).map(action => (
                <ActionButton key={action.id} label={action.title} onClick={() => action.run(selected)}>
                  <MoreHorizontal />
                </ActionButton>
              ))}
              <ActionButton
                label={selected?.lock?.edit ? 'Unlock editing' : 'Lock editing'}
                disabled={!selected}
                onClick={() => selected && setLock(selected.id, {
                  ...selected.lock,
                  edit: !selected.lock?.edit,
                })}
              >
                {selected?.lock?.edit ? <Lock /> : <Unlock />}
              </ActionButton>
            </div>

            <Button type="button" size="xs" disabled={!dirty} onClick={save}>
              {dirty ? <Save /> : <Check />}
              {dirty ? 'Save' : 'Saved'}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="lg:hidden"
                  aria-label="Open inspector"
                >
                  <PanelRight />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] gap-0 p-0 sm:max-w-xs">
                <SheetHeader className="sr-only">
                  <SheetTitle>Inspector</SheetTitle>
                  <SheetDescription>Settings</SheetDescription>
                </SheetHeader>
                {inspectorPanel}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {error && (
          <div className="border-b border-destructive/20 bg-destructive/10 px-3 py-1 text-xs text-destructive">
            {error}
          </div>
        )}

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-0 lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:p-2">
          <aside className="hidden min-h-0 lg:block" aria-label="Page structure">
            {blocksPanel}
          </aside>

          <div className="min-h-0 overflow-auto bg-muted/40">
            <div className="flex min-h-full items-start justify-center p-2">
              <div className={
                viewport === 'mobile'
                  ? 'w-full max-w-[390px]'
                  : viewport === 'tablet'
                    ? 'w-full max-w-[820px]'
                    : 'w-full max-w-[1440px]'
              }>
                <iframe
                  ref={iframe}
                  src={runtime.previewUrl}
                  title="Page builder preview"
                  className="block h-[calc(100svh-66px)] min-h-[540px] w-full bg-background"
                />
              </div>
            </div>
          </div>

          <aside className="hidden min-h-0 lg:block" aria-label="Section inspector">
            {inspectorPanel}
          </aside>
        </section>
      </main>
    </TooltipProvider>
  );
}
