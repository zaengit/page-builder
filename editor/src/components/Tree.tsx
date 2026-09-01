import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Copy, Eye, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  return <div ref={setNodeRef} data-drop-id={dropId} className={cn('rounded-md border border-dashed px-2 py-2 text-center text-[11px] text-muted-foreground', isOver && 'border-primary bg-primary/5 text-primary')} role="status" aria-live="polite">Drop blocks here</div>;
}

function TreeItem({ block, definitions, selectedId, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [expanded, setExpanded] = useState(true);
  const definition = definitions.find(item => item.name === block.type);
  const title = definition?.title ?? block.type;
  const active = selectedId === block.id;
  const hasChildren = Boolean(definition?.supports?.children);

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="space-y-0.5">
    <div className={cn('group flex min-h-7 items-center rounded-md hover:bg-accent hover:text-accent-foreground', active && 'bg-accent text-accent-foreground')}>
      {hasChildren ? <Button type="button" variant="ghost" size="icon-xs" onClick={() => setExpanded(value => !value)} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}>{expanded ? <ChevronDown /> : <ChevronRight />}</Button> : <span className="w-6" />}
      <Button type="button" variant="ghost" size="xs" className="min-w-0 flex-1 justify-start px-1.5 font-normal" aria-pressed={active} onClick={() => onSelect(block.id)}>{title}</Button>
      <Button type="button" variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 focus:opacity-100" {...attributes} {...listeners} aria-label={`Move ${title}`}><GripVertical /></Button>
      <Button type="button" variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${title}`}><Copy /></Button>
      <Button type="button" variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => onRemove(block.id)} aria-label={`Remove ${title}`}><Trash2 /></Button>
    </div>
    {hasChildren && expanded && <div className="ml-3 space-y-0.5 border-l pl-2">{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <ChildDrop blockId={block.id} />}</div>}
  </div>;
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

  return <div className="space-y-0.5 py-1">
    {(['header', 'template', 'footer'] as const).map((region, index) => <div key={region}>
      {index > 0 && <Separator className="my-1" />}
      <div className="px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5"><span className="text-xs font-medium">{region === 'template' ? 'Template' : region[0].toUpperCase() + region.slice(1)}</span><Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{groups[region].length}</Badge></div>
          <div className="flex items-center"><Button type="button" variant="ghost" size="icon-xs" aria-label={`Toggle ${region} visibility`}><Eye /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label={`${region} actions`}><MoreHorizontal /></Button></div>
        </div>
        <div className="space-y-1">
          {groups[region].length ? <Tree {...props} blocks={groups[region]} /> : <div className="rounded-md border border-dashed px-2 py-2 text-center text-[11px] text-muted-foreground">No {region} sections</div>}
          {props.renderAdd(region)}
        </div>
      </div>
    </div>)}
  </div>;
}
