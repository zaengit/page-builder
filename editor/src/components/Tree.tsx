import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Copy, Eye, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BlockDefinition, PageBlock } from '../types';

type TreeProps = {
  blocks: PageBlock[];
  definitions: BlockDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
};

function ChildDrop({ blockId }: { blockId: string }) {
  const dropId = `children:${blockId}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return <div ref={setNodeRef} data-drop-id={dropId} className={cn('rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground', isOver && 'border-primary bg-primary/5 text-primary')} role="status" aria-live="polite">Drop blocks here</div>;
}

function TreeItem({ block, definitions, selectedId, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [expanded, setExpanded] = useState(true);
  const definition = definitions.find(item => item.name === block.type);
  const title = definition?.title ?? block.type;
  const active = selectedId === block.id;
  const hasChildren = Boolean(definition?.supports?.children);

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="space-y-1">
    <div className={cn('group flex items-center rounded-md border bg-background', active && 'border-primary bg-primary/5')}>
      {hasChildren ? <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExpanded(value => !value)} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}>{expanded ? <ChevronDown /> : <ChevronRight />}</Button> : <span className="w-8" />}
      <Button type="button" variant="ghost" className="min-w-0 flex-1 justify-start truncate" aria-pressed={active} onClick={() => onSelect(block.id)}>{title}</Button>
      <Button type="button" variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" {...attributes} {...listeners} aria-label={`Move ${title}`}><GripVertical /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${title}`}><Copy /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => onRemove(block.id)} aria-label={`Remove ${title}`}><Trash2 /></Button>
    </div>
    {hasChildren && expanded && <div className="ml-4 space-y-1 border-l pl-3">{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <ChildDrop blockId={block.id} />}</div>}
  </div>;
}

export function Tree(props: TreeProps) {
  return <SortableContext items={props.blocks.map(block => block.id)} strategy={verticalListSortingStrategy}><div className="space-y-1">{props.blocks.map(block => <TreeItem key={block.id} {...props} block={block} />)}</div></SortableContext>;
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

  return <div className="space-y-3 p-3">
    {(['header', 'template', 'footer'] as const).map(region => <Card key={region} className="gap-3 py-3">
      <CardHeader className="px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{region === 'template' ? 'Template' : region[0].toUpperCase() + region.slice(1)}</CardTitle>
          <div className="flex items-center gap-1"><Badge variant="secondary">{groups[region].length}</Badge><Button type="button" variant="ghost" size="icon-sm" aria-label={`Toggle ${region} visibility`}><Eye /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`${region} actions`}><MoreHorizontal /></Button></div>
        </div>
      </CardHeader>
      <CardContent className="px-3">{groups[region].length ? <Tree {...props} blocks={groups[region]} /> : <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No {region} sections</div>}</CardContent>
      <CardFooter className="px-3">{props.renderAdd(region)}</CardFooter>
    </Card>)}
  </div>;
}
