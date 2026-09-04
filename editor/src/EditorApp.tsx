import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Blocks,
  Check,
  ChevronLeft,
  ClipboardPaste,
  Copy,
  Download,
  FileJson,
  Lock,
  Maximize2,
  Monitor,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Redo2,
  Save,
  Settings2,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Control } from "./components/Controls";
import { ColorSchemeManager } from "./components/ColorSchemePanel";
import { DynamicDataPanel } from "./components/DynamicDataPanel";
import { Inserter } from "./components/Inserter";
import { SectionTree } from "./components/Tree";
import { TypographyPanel } from "./components/TypographyPanel";
import {
  readClipboardBlock,
  useAutosave,
  useChangeEmitter,
  useEditorMessages,
  useEditorShortcuts,
  usePreview,
} from "./hooks/useEditorEffects";
import { LayoutInspectorPanels } from "./layout-editor-plugin";
import { injectLayoutStyles } from "./layout-preview";
import {
  getBlockEditor,
  getInspectorPanels,
  getRegisteredPatterns,
  getToolbarActions,
  getTransforms,
} from "./registry";
import { createBuilderStore, findBlock } from "./store";
import type {
  BlockDefinition,
  BlockStyle,
  Breakpoint,
  EditorRuntime,
  LayoutItem,
  PageBlock,
  PageContent,
  PageSettings,
  Pattern,
  SectionLayout,
} from "./types";

type Props = {
  root: HTMLElement;
  runtime: EditorRuntime;
  initial: PageContent;
};

function styleValue(
  block: PageBlock,
  key: keyof BlockStyle,
  breakpoint: Breakpoint,
): string {
  const value = block.styles?.[key];
  if (value && typeof value === "object" && !Array.isArray(value))
    return String((value as Record<string, unknown>)[breakpoint] ?? "");
  return String(value ?? "");
}

function InspectorPanel({
  selected,
  definition,
  blocks,
  breakpoint,
  runtime,
  onChange,
  onStyle,
  onLayout,
  onLayoutItem,
  onBindings,
  onLock,
  requestMedia,
}: {
  selected: PageBlock | null;
  definition?: BlockDefinition;
  blocks: PageBlock[];
  breakpoint: Breakpoint;
  runtime: EditorRuntime;
  onChange: (id: string, patch: Record<string, unknown>) => void;
  onStyle: (id: string, patch: Partial<BlockStyle>) => void;
  onLayout: (id: string, layout: SectionLayout) => void;
  onLayoutItem: (id: string, layoutItem: LayoutItem) => void;
  onBindings: (id: string, bindings: PageBlock["bindings"]) => void;
  onLock: (id: string, lock: NonNullable<PageBlock["lock"]>) => void;
  requestMedia?: (path: string[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"content" | "design" | "advanced">("content");
  const transforms = selected ? getTransforms(selected.type) : [];
  const extensions = getInspectorPanels();
  const CustomEditor = selected ? getBlockEditor(selected.type) : undefined;
  const styleKeys: Array<keyof BlockStyle> = [
    "background",
    "color",
    "padding",
    "margin",
    "gap",
    "width",
    "fontSize",
    "borderRadius",
    "boxShadow",
  ];

  useEffect(() => {
    setActiveTab("content");
  }, [selected?.id]);

  const updateStyleValue = (key: keyof BlockStyle, value: string) => {
    if (!selected) return;
    const current = selected.styles?.[key];
    const responsive =
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : { desktop: current };
    onStyle(selected.id, {
      [key]: {
        ...responsive,
        [breakpoint]: value,
      },
    });
  };

  return (
    <Card className="editor-panel h-full min-h-0 gap-0 overflow-hidden border-0 p-0 shadow-none">
      <CardHeader className="editor-panel-header shrink-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Blocks className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm leading-tight">
                {definition?.title ?? "Block settings"}
              </CardTitle>
              <CardDescription className="mt-1 truncate text-[11px]">
                {selected ? `Selected block · ${breakpoint}` : "Inspector"}
              </CardDescription>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="editor-icon-button"
              aria-label="Inspector options"
            >
              <MoreHorizontal />
            </Button>
          </div>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        {selected && definition ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (value === "content" || value === "design" || value === "advanced") setActiveTab(value);
            }}
            className="min-h-full"
          >
            <div className="sticky top-0 z-10 bg-card/95 px-4 pt-3 backdrop-blur">
              <TabsList className="grid h-9 w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="content" className="mt-0 px-4 pb-5 pt-1">
              <Accordion type="multiple" defaultValue={["layout", "attributes"]} className="divide-y divide-border/40">
                <AccordionItem value="layout" className="border-b border-border/40">
                  <AccordionTrigger>Layout</AccordionTrigger>
                  <AccordionContent>
                    <LayoutInspectorPanels
                      selected={selected}
                      blocks={blocks}
                      breakpoint={breakpoint}
                      canLayout={Boolean(definition.supports?.children)}
                      onLayout={(layout) => onLayout(selected.id, layout)}
                      onLayoutItem={(item) => onLayoutItem(selected.id, item)}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="attributes" className="border-b border-border/40">
                  <AccordionTrigger>Content</AccordionTrigger>
                  <AccordionContent>
                    {CustomEditor ? (
                      <CustomEditor
                        block={selected}
                        definition={definition}
                        updateAttrs={(attrs) => onChange(selected.id, attrs)}
                      />
                    ) : (
                      <div className="space-y-4">
                        {definition.description && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {definition.description}
                          </p>
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
                            onChange={(value) => onChange(selected.id, { [name]: value })}
                            requestMedia={requestMedia}
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="design" className="mt-0 px-4 pb-5 pt-1">
              {definition.supports?.styles !== false ? (
                <Accordion type="multiple" defaultValue={["styles"]} className="divide-y divide-border/40">
                  <AccordionItem value="styles" className="border-b border-border/40">
                    <AccordionTrigger>Styles · {breakpoint}</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        {styleKeys.map((key) => (
                          <div key={key} className="grid gap-1.5">
                            <Label className="text-xs capitalize">{key}</Label>
                            <Input
                              className="h-9 text-xs"
                              value={styleValue(selected, key, breakpoint)}
                              onChange={(event) => updateStyleValue(key, event.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                <div className="rounded-xl bg-muted/45 p-4 text-xs leading-relaxed text-muted-foreground">
                  This block does not expose design controls.
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 px-4 pb-5 pt-1">
              <Accordion type="multiple" defaultValue={["data", "locking"]} className="divide-y divide-border/40">
                <AccordionItem value="data" className="border-b border-border/40">
                  <AccordionTrigger>Dynamic data</AccordionTrigger>
                  <AccordionContent>
                    <DynamicDataPanel
                      selected={selected}
                      definition={definition}
                      runtime={runtime}
                      onBindings={onBindings}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="locking" className="border-b border-border/40">
                  <AccordionTrigger>Locking</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {(["move", "remove", "edit"] as const).map((key) => (
                        <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Lock className="size-3.5 text-muted-foreground" />
                            <Label className="text-xs capitalize">Lock {key}</Label>
                          </div>
                          <Switch
                            size="sm"
                            checked={Boolean(selected.lock?.[key])}
                            onCheckedChange={(value) => onLock(selected.id, { ...selected.lock, [key]: value })}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                {transforms.length > 0 && (
                  <AccordionItem value="transform" className="border-b border-border/40">
                    <AccordionTrigger>Transform</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-2">
                        {transforms.map((transform) => (
                          <Button
                            key={transform.name}
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="w-full justify-start"
                            onClick={() => window.dispatchEvent(new CustomEvent("page-builder:transform-request", { detail: { blockId: selected.id, transform } }))}
                          >
                            {transform.title}
                          </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {extensions.map((extension) => {
                  const Panel = extension.render;
                  return (
                    <AccordionItem key={extension.id} value={extension.id} className="border-b border-border/40">
                      <AccordionTrigger>{extension.title}</AccordionTrigger>
                      <AccordionContent>
                        <Panel block={selected} definition={definition} />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 bg-muted/20 p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Settings2 className="size-5" />
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">Nothing selected</p>
              <p className="max-w-[210px] text-xs leading-relaxed text-muted-foreground">
                Select a block on the canvas or from Page structure to edit it.
              </p>
            </div>
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
    ["contentWidth", "Content width"],
    ["background", "Page background"],
    ["customClass", "Body class"],
    ["customCss", "Custom CSS"],
  ];
  return (
    <div className="p-4">
      <Accordion type="multiple" defaultValue={["canvas", "typography", "color-schemes"]} className="divide-y divide-border/40">
        <AccordionItem value="canvas" className="border-b border-border/40">
          <AccordionTrigger>Page canvas</AccordionTrigger>
          <AccordionContent className="grid gap-4">
            <div className="rounded-xl bg-muted/35 p-3">
              <p className="text-sm font-medium">Page canvas</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Configure the page-wide rendering defaults and custom styles.
              </p>
            </div>
            {fields.map(([key, label]) => (
              <div className="grid gap-1.5" key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="h-9 text-xs"
                  value={String(settings?.[key] ?? "")}
                  onChange={(event) => onChange({ [key]: event.target.value })}
                />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="typography" className="border-b border-border/40">
          <AccordionTrigger>Global typography</AccordionTrigger>
          <AccordionContent>
            <TypographyPanel settings={settings} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="color-schemes" className="border-b border-border/40">
          <AccordionTrigger>Color schemes</AccordionTrigger>
          <AccordionContent>
            <ColorSchemeManager settings={settings} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
          className="editor-icon-button"
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

function ViewportToggle({
  viewport,
  onChange,
}: {
  viewport: Breakpoint;
  onChange: (value: Breakpoint) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={viewport}
      onValueChange={(value) => {
        if (value === "desktop" || value === "tablet" || value === "mobile") onChange(value);
      }}
      className="bg-background/70 shadow-sm"
    >
      <ToggleGroupItem value="desktop" aria-label="Desktop preview" className="px-2.5">
        <Monitor />
        <span className="hidden xl:inline">Desktop</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="tablet" aria-label="Tablet preview" className="px-2.5">
        <Tablet />
        <span className="hidden xl:inline">Tablet</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" aria-label="Mobile preview" className="px-2.5">
        <Smartphone />
        <span className="hidden xl:inline">Mobile</span>
      </ToggleGroupItem>
    </ToggleGroup>
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
    updateLayout,
    updateLayoutItem,
    moveBlockToLayout,
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
  const [error, setError] = useState("");
  const [clipboard, setClipboard] = useState<PageBlock | null>(null);
  const [viewport, setViewport] = useState<Breakpoint>("desktop");
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const iframe = useRef<HTMLIFrameElement>(null);
  const mediaRequest = useRef<{ id: string; path: string[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const selected = useMemo(
    () => findBlock(content.blocks, selectedId),
    [content.blocks, selectedId],
  );
  const definition = definitions.find((item) => item.name === selected?.type);
  const patterns = [...(runtime.patterns ?? []), ...getRegisteredPatterns()];

  useEffect(() => {
    let active = true;
    bootstrap(runtime, initial)
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "Failed to load builder",
          );
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
    moveCanvasBlock: (id, parentId, index) => moveBlockToLayout(id, parentId, index, undefined, viewport),
  });
  useEditorShortcuts(selectedId, undo, redo, duplicateBlock);
  usePreview(content, ready, runtime, iframe, setError);
  useChangeEmitter(root, content, ready);
  useAutosave(root, content, dirty, ready, runtime.autosaveMs ?? 0);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.blockId && detail?.transform)
        applyTransform(detail.blockId, detail.transform);
    };
    addEventListener("page-builder:transform-request", listener);
    return () =>
      removeEventListener("page-builder:transform-request", listener);
  }, [applyTransform]);
  useEffect(() => {
    if (ready && selectedId)
      iframe.current?.contentWindow?.postMessage(
        { type: "PB_EDITOR_SELECTION", blockId: selectedId },
        location.origin,
      );
  }, [ready, selectedId]);
  useEffect(() => {
    const doc = iframe.current?.contentDocument;
    if (doc) injectLayoutStyles(doc, content.blocks, viewport);
  }, [content, viewport]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    if (overId.startsWith("container:")) {
      moveBlockToLayout(
        activeId,
        overId.slice("container:".length),
        undefined,
        undefined,
        viewport,
      );
      return;
    }
    if (overId.startsWith("flexpos:")) {
      const [, parentId, indexRaw] = overId.split(":");
      moveBlockToLayout(
        activeId,
        parentId,
        Number(indexRaw),
        undefined,
        viewport,
      );
      return;
    }
    if (overId.startsWith("gridcell:")) {
      const [, parentId, rowRaw, colRaw] = overId.split(":");
      moveBlockToLayout(
        activeId,
        parentId,
        undefined,
        { row: Number(rowRaw), column: Number(colRaw) },
        viewport,
      );
      return;
    }
    moveBlock(activeId, overId);
  };

  const copySelected = async () => {
    if (!selected) return;
    const copy = structuredClone(selected);
    setClipboard(copy);
    await navigator.clipboard?.writeText(
      JSON.stringify({ pageBuilderBlock: copy }),
    );
  };
  const paste = async () => {
    const block = await readClipboardBlock(clipboard);
    if (block)
      insertBlock(
        block,
        selected && definition?.supports?.children ? selected.id : null,
      );
  };
  const requestMedia = (path: string[]) => {
    if (!selected) return;
    mediaRequest.current = { id: selected.id, path };
    const detail = {
      blockId: selected.id,
      path,
      value: path.reduce<unknown>(
        (current, segment) =>
          Array.isArray(current)
            ? current[Number(segment)]
            : current && typeof current === "object"
              ? (current as Record<string, unknown>)[segment]
              : undefined,
        selected.attrs,
      ),
    };
    root.dispatchEvent(
      new CustomEvent("page-builder:media-request", { detail, bubbles: true }),
    );
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "PAGE_BUILDER_MEDIA_REQUEST", ...detail },
        location.origin,
      );
  };
  const save = () => {
    root.dispatchEvent(
      new CustomEvent("page-builder:save-request", {
        detail: { content, autosave: false },
        bubbles: true,
      }),
    );
    root.dispatchEvent(
      new CustomEvent("page-builder:save", {
        detail: { content },
        bubbles: true,
      }),
    );
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "PAGE_BUILDER_SAVE", content },
        location.origin,
      );
    markSaved();
  };
  const exportPage = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "page-builder.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importPage = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as PageContent;
      if (!Array.isArray(parsed.blocks)) throw new Error("Invalid page JSON");
      replaceContent(parsed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid page JSON");
    }
  };
  const addTopLevel = (
    type: string,
    variation?: Parameters<typeof addBlock>[2],
  ) => addBlock(type, null, variation);

  const blocksPanel = (
    <Card className="editor-panel h-full min-h-0 gap-0 overflow-hidden border-0 p-0 shadow-none">
      <CardHeader className="editor-panel-header shrink-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Blocks className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm leading-tight">Page structure</CardTitle>
              <CardDescription className="mt-1 text-[11px]">
                Organize sections and blocks
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[10px] tabular-nums">
            {content.blocks.length} {content.blocks.length === 1 ? "section" : "sections"}
          </Badge>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SectionTree
            blocks={content.blocks}
            definitions={definitions}
            selectedId={selectedId}
            breakpoint={viewport}
            onSelect={select}
            onRemove={removeBlock}
            onDuplicate={duplicateBlock}
            renderAdd={(region) => (
              <div className="mt-3 grid gap-2">
                <Inserter
                  definitions={definitions}
                  onAdd={addTopLevel}
                  label={region === "template" ? "Add section" : `Add ${region} section`}
                />
                {region === "template" && (patterns.length > 0 || (runtime.templates?.length ?? 0) > 0) && (
                  <div className="grid gap-1 rounded-lg bg-muted/30 p-2">
                    <p className="editor-section-label px-1">Saved layouts</p>
                    {patterns.map((pattern: Pattern) => (
                      <Button
                        key={`pattern:${pattern.id}`}
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="h-8 justify-start px-2 text-xs font-normal"
                        onClick={() => insertPattern(pattern)}
                      >
                        <Sparkles className="text-primary" />
                        <span className="truncate">{pattern.title}</span>
                      </Button>
                    ))}
                    {runtime.templates?.map((template) => (
                      <Button
                        key={`template:${template.id}`}
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="h-8 justify-start px-2 text-xs font-normal"
                        onClick={() => replaceContent(template.content)}
                      >
                        <FileJson className="text-muted-foreground" />
                        <span className="truncate">{template.title}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          />
        </DndContext>
      </ScrollArea>
    </Card>
  );

  const inspectorPanel = pageSettingsOpen ? (
    <Card className="editor-panel h-full min-h-0 gap-0 overflow-hidden border-0 p-0 shadow-none">
      <CardHeader className="editor-panel-header shrink-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Page settings</CardTitle>
              <CardDescription className="mt-1 text-[11px]">Global canvas defaults</CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="editor-icon-button hidden lg:flex"
            aria-label="Back to block inspector"
            onClick={() => setPageSettingsOpen(false)}
          >
            <ChevronLeft />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <PageSettingsPanel
          settings={content.settings}
          onChange={updateSettings}
        />
      </ScrollArea>
    </Card>
  ) : (
    <InspectorPanel
      selected={selected}
      definition={definition}
      blocks={content.blocks}
      breakpoint={viewport}
      runtime={runtime}
      onChange={updateAttrs}
      onStyle={updateStyles}
      onLayout={updateLayout}
      onLayoutItem={updateLayoutItem}
      onBindings={updateBindings}
      onLock={setLock}
      requestMedia={runtime.mediaPicker ? requestMedia : undefined}
    />
  );

  const zoomScale = canvasZoom / 100;
  const sidebarGridClass = leftSidebarOpen
    ? rightSidebarOpen
      ? "lg:grid-cols-[272px_minmax(0,1fr)_328px]"
      : "lg:grid-cols-[272px_minmax(0,1fr)_0px]"
    : rightSidebarOpen
      ? "lg:grid-cols-[0px_minmax(0,1fr)_328px]"
      : "lg:grid-cols-[0px_minmax(0,1fr)_0px]";

  if (!ready)
    return (
      <div
        className="pb-editor flex min-h-[420px] items-center justify-center bg-muted/30 p-4"
        role="status"
      >
        Loading page builder…
      </div>
    );

  return (
    <TooltipProvider>
      <main className="pb-editor flex h-svh min-h-[600px] flex-col overflow-hidden text-foreground">
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => void importPage(event.target.files?.[0])}
        />
        <header className="editor-navbar flex h-14 shrink-0 items-center gap-3 border-b border-border/45 bg-card/90 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <ActionButton label="Back" onClick={() => history.back()}>
              <ChevronLeft />
            </ActionButton>
            <Separator orientation="vertical" className="editor-divider mx-0 h-6" />
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold tracking-tight">Page Builder</span>
                <Badge variant="secondary" className="rounded-md px-1.5 py-0.5 text-[9px] font-medium">Editor</Badge>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">Untitled page</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-1.5 md:flex">
              <span className={`size-2 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className="text-[11px] text-muted-foreground">{dirty ? "Unsaved changes" : "All changes saved"}</span>
            </div>
            <Separator orientation="vertical" className="editor-divider mx-1 hidden h-6 md:block" />
            <div className="hidden sm:flex">
              <ActionButton label="Undo" disabled={!past.length} onClick={undo}>
                <Undo2 />
              </ActionButton>
              <ActionButton
                label="Redo"
                disabled={!future.length}
                onClick={redo}
              >
                <Redo2 />
              </ActionButton>
            </div>
            <ActionButton
              label="Page settings"
              onClick={() => setPageSettingsOpen((value) => !value)}
            >
              <Settings2 />
            </ActionButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="editor-icon-button" aria-label="More page actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Page actions</DropdownMenuLabel>
                <DropdownMenuItem disabled={!selected} onSelect={() => void copySelected()}><Copy />Copy block</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void paste()}><ClipboardPaste />Paste block</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => fileInput.current?.click()}><Upload />Import JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportPage}><Download />Export JSON</DropdownMenuItem>
                {selected && getToolbarActions(selected).length > 0 && <DropdownMenuSeparator />}
                {selected && getToolbarActions(selected).map((action) => (
                  <DropdownMenuItem key={action.id} onSelect={() => action.run(selected)}><Play />{action.title}</DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!selected}
                  onSelect={() => selected && setLock(selected.id, { ...selected.lock, edit: !selected.lock?.edit })}
                >
                  {selected?.lock?.edit ? <Unlock /> : <Lock />}
                  {selected?.lock?.edit ? "Unlock editing" : "Lock editing"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-1">
              <div className="hidden lg:flex">
                <ActionButton
                  label={leftSidebarOpen ? "Hide page structure" : "Show page structure"}
                  onClick={() => setLeftSidebarOpen((value) => !value)}
                >
                  {leftSidebarOpen ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
                </ActionButton>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="editor-icon-button lg:hidden"
                    aria-label="Open page structure"
                  >
                    <PanelLeft className="size-[18px]" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[88vw] gap-0 p-0 sm:max-w-xs"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Page structure</SheetTitle>
                    <SheetDescription>Blocks</SheetDescription>
                  </SheetHeader>
                  {blocksPanel}
                </SheetContent>
              </Sheet>
              <div className="hidden lg:flex">
                <ActionButton
                  label={rightSidebarOpen ? "Hide inspector" : "Show inspector"}
                  onClick={() => setRightSidebarOpen((value) => !value)}
                >
                  {rightSidebarOpen ? <PanelRightClose className="size-[18px]" /> : <PanelRightOpen className="size-[18px]" />}
                </ActionButton>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="lg:hidden"
                    aria-label="Open inspector"
                  >
                    <PanelRight className="size-[18px]" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[88vw] gap-0 p-0 sm:max-w-xs"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Inspector</SheetTitle>
                    <SheetDescription>Settings</SheetDescription>
                  </SheetHeader>
                  {inspectorPanel}
                </SheetContent>
              </Sheet>
            </div>
            <Button type="button" size="sm" className="min-w-[76px] gap-1.5 rounded-lg shadow-sm" disabled={!dirty} onClick={save}>
              {dirty ? <Save /> : <Check />}
              {dirty ? "Save" : "Saved"}
            </Button>
          </div>
        </header>
        {error && (
          <div className="mx-3 mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive sm:mx-4">
            <span className="font-medium">Something went wrong:</span> {error}
          </div>
        )}
        <section className={`grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:p-4 ${sidebarGridClass}`}>
          {leftSidebarOpen ? (
            <aside className="hidden min-h-0 lg:block" aria-label="Page structure">
              {blocksPanel}
            </aside>
          ) : (
            <aside className="hidden min-h-0 min-w-0 overflow-hidden lg:block" aria-hidden="true" />
          )}
          <div className="editor-canvas flex min-h-0 flex-col overflow-hidden rounded-xl">
            <div className="flex h-12 shrink-0 items-center justify-between gap-3 bg-card/75 px-3 backdrop-blur sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129_/_0.14)]" />
                <span className="text-xs font-medium">Live preview</span>
                <Badge variant="ghost" className="hidden rounded-md text-[10px] text-muted-foreground sm:inline-flex">
                  {viewport === "desktop" ? "1440px" : viewport === "tablet" ? "820px" : "390px"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <ViewportToggle viewport={viewport} onChange={setViewport} />
                <Separator orientation="vertical" className="editor-divider mx-1 hidden h-6 sm:block" />
                <div className="hidden items-center gap-0.5 sm:flex">
                  <ActionButton label="Zoom out" disabled={canvasZoom <= 60} onClick={() => setCanvasZoom((value) => Math.max(60, value - 10))}>
                    <ZoomOut />
                  </ActionButton>
                  <Button type="button" variant="ghost" size="xs" className="min-w-12 font-medium tabular-nums text-muted-foreground hover:text-foreground" onClick={() => setCanvasZoom(100)}>
                    {canvasZoom}%
                  </Button>
                  <ActionButton label="Zoom in" disabled={canvasZoom >= 120} onClick={() => setCanvasZoom((value) => Math.min(120, value + 10))}>
                    <ZoomIn />
                  </ActionButton>
                </div>
                <ActionButton label="Fullscreen preview" onClick={() => void iframe.current?.requestFullscreen()}>
                  <Maximize2 />
                </ActionButton>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
              <div className="flex h-full min-h-0 items-start justify-center">
                <div
                  className={
                    viewport === "mobile"
                      ? "h-full w-full max-w-[390px]"
                      : viewport === "tablet"
                        ? "h-full w-full max-w-[820px]"
                        : "h-full w-full max-w-[1440px]"
                  }
                  style={{
                    width: `${100 / zoomScale}%`,
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "top center",
                  }}
                >
                  <div className="editor-preview-frame h-full min-h-0 bg-background">
                    <iframe
                      ref={iframe}
                      src={runtime.previewUrl}
                      title="Page builder preview"
                      className="block h-full min-h-0 w-full bg-background"
                      onLoad={() => {
                        const doc = iframe.current?.contentDocument;
                        if (doc) injectLayoutStyles(doc, content.blocks, viewport);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {rightSidebarOpen ? (
            <aside className="hidden min-h-0 lg:block" aria-label="Section inspector">
              {inspectorPanel}
            </aside>
          ) : (
            <aside className="hidden min-h-0 min-w-0 overflow-hidden lg:block" aria-hidden="true" />
          )}
        </section>
      </main>
    </TooltipProvider>
  );
}
