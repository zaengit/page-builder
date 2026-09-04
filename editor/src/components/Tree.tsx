import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, ChevronDown, ChevronRight, Copy, Eye, GripVertical, LayoutGrid, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { responsive } from '../layout';
import type { BlockDefinition, Breakpoint, PageBlock } from '../types';

type TreeProps = {
  blocks: PageBlock[];
  definitions: BlockDefinition[];
  selectedId: string | null;
  breakpoint: Breakpoint;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
};

function DropTarget({ id, label, compact = false }: { id: string; label: string; compact?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} data-drop-id={id} className={cn('rounded-lg border border-dashed border-border/35 text-center text-[10px] text-muted-foreground transition-colors', compact ? 'min-h-2 py-0.5' : 'px-2 py-1.5', isOver && 'border-primary/60 bg-primary/10 text-primary')} role="status" aria-live="polite">{isOver ? label : compact ? '' : label}</div>;
}

function GridTargets({ block, breakpoint }: { block: PageBlock; breakpoint: Breakpoint }) {
  const columns = Math.max(1, responsive(block.layout?.gridColumns, breakpoint, 1));
  const configuredRows = responsive(block.layout?.gridRows, breakpoint, 'auto');
  const rows = configuredRows === 'auto' ? Math.max(1, Math.ceil(((block.children?.length ?? 0) + 1) / columns)) : Math.max(1, Number(configuredRows));
  return <div className="grid gap-1 py-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {Array.from({ length: columns * rows }, (_, index) => {
      const row = Math.floor(index / columns) + 1;
      const column = (index % columns) + 1;
      return <DropTarget key={`${row}:${column}`} id={`gridcell:${block.id}:${row}:${column}`} label={`${row},${column}`} />;
    })}
  </div>;
}

function FlexChildren({ block, props }: { block: PageBlock; props: TreeProps }) {
  const children = block.children ?? [];
  return <div className="space-y-0.5">
    <DropTarget id={`flexpos:${block.id}:0`} label="Drop at start" compact />
    {children.map((child, index) => <div key={child.id}>
      <TreeItem block={child} {...props} />
      <DropTarget id={`flexpos:${block.id}:${index + 1}`} label="Drop here" compact />
    </div>)}
  </div>;
}

function TreeItem({ block, definitions, selectedId, breakpoint, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [expanded, setExpanded] = useState(true);
  const definition = definitions.find(item => item.name === block.type);
  const title = definition?.title ?? block.type;
  const active = selectedId === block.id;
  const hasChildren = Boolean(definition?.supports?.children);
  const layoutMode = responsive(block.layout?.mode, breakpoint, 'block');

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="space-y-0.5">
    <div className={cn('group flex min-h-9 items-center rounded-lg px-1 transition-colors hover:bg-accent/70', active && 'bg-primary/10 text-primary shadow-[inset_2px_0_0_var(--primary)]')}>
      {hasChildren ? <Button type="button" variant="ghost" size="icon-xs" className="shrink-0 text-muted-foreground" onClick={() => setExpanded(value => !value)} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}>{expanded ? <ChevronDown /> : <ChevronRight />}</Button> : <span className="w-6 shrink-0" />}
      <Button type="button" variant="ghost" size="sm" className="min-w-0 flex-1 justify-start gap-2 px-1.5 text-xs font-medium hover:bg-transparent hover:text-inherit" aria-pressed={active} onClick={() => onSelect(block.id)}>
        <span aria-hidden="true" className={cn('flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground', active && 'bg-primary/10 text-primary')}><BlocksIcon hasChildren={hasChildren} /></span>
        <span className="truncate">{title}</span>
      </Button>
      {hasChildren && <Badge variant="ghost" className="mr-0.5 hidden h-5 rounded-md px-1.5 text-[9px] text-muted-foreground sm:inline-flex">{layoutMode}</Badge>}
      <Button type="button" variant="ghost" size="icon-xs" className="editor-icon-button opacity-60 transition-opacity group-hover:opacity-100 focus:opacity-100" {...attributes} {...listeners} aria-label={`Move ${title}`}><GripVertical /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" className="editor-icon-button opacity-60 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label={`${title} actions`}><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={Boolean(block.lock?.edit)} onSelect={() => onDuplicate(block.id)}><Copy />Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={Boolean(block.lock?.remove)} onSelect={() => onRemove(block.id)}><Trash2 />Remove</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {hasChildren && expanded && <div className="ml-3 space-y-0.5 border-l border-border/45 pl-2">
      {layoutMode === 'grid' ? <><GridTargets block={block} breakpoint={breakpoint} />{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} breakpoint={breakpoint} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : null}</>
        : layoutMode === 'flex' ? <FlexChildren block={block} props={{ blocks: block.children ?? [], definitions, selectedId, breakpoint, onSelect, onRemove, onDuplicate }} />
          : block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} breakpoint={breakpoint} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <DropTarget id={`container:${block.id}`} label="Drop blocks here" />}
      {layoutMode !== 'block' && <DropTarget id={`container:${block.id}`} label="Drop into container" />}
    </div>}
  </div>;
}

function BlocksIcon({ hasChildren }: { hasChildren: boolean }) {
  return hasChildren ? <LayoutGrid className="size-3" /> : <Box className="size-3" />;
}

export function Tree(props: TreeProps) {
  return <SortableContext items={props.blocks.map(block => block.id)} strategy={verticalListSortingStrategy}><div className="space-y-0.5">{props.blocks.map(block => <TreeItem key={block.id} {...props} block={block} />)}</div></SortableContext>;
}

function regionFor(block: PageBlock): 'header' | 'template' | 'footer' {
  const type = block.type.toLowerCase();
  if (type.includes('footer')) return 'footer';
  if (type.includes('header') || type.includes('announcement')) return 'header';
  return 'template';
}

export function SectionTree(props: TreeProps & { renderAdd: (region: 'header' | 'template' | 'footer') => React.ReactNode }) {
  const groups = {
    header: props.blocks.filter(block => regionFor(block) === 'header'),
    template: props.blocks.filter(block => regionFor(block) === 'template'),
    footer: props.blocks.filter(block => regionFor(block) === 'footer'),
  };
  return <div className="space-y-0.5 py-2">{(['header', 'template', 'footer'] as const).map((region, index) => <div key={region}>
    {index > 0 && <Separator className="editor-divider my-2" />}
    <div className="px-3 py-1.5">
      <div className="mb-2 flex items-center justify-between gap-1.5"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{region === 'template' ? 'Template' : region[0].toUpperCase() + region.slice(1)}</span><Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] tabular-nums">{groups[region].length}</Badge></div><div className="flex items-center"><Button type="button" variant="ghost" size="icon-xs" className="editor-icon-button" aria-label={`Toggle ${region} visibility`}><Eye /></Button><Button type="button" variant="ghost" size="icon-xs" className="editor-icon-button" aria-label={`${region} actions`}><MoreHorizontal /></Button></div></div>
      <div className="space-y-1">{groups[region].length ? <Tree {...props} blocks={groups[region]} /> : <div className="rounded-lg bg-muted/35 px-2 py-3 text-center text-[11px] text-muted-foreground">No {region} sections</div>}{props.renderAdd(region)}</div>
    </div>
  </div>)}</div>;
}
