import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Copy, Eye, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  return <div ref={setNodeRef} data-drop-id={dropId} className={cn('mx-2 rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground transition-colors', isOver && 'border-[#005bd3] bg-[#eaf4ff] text-[#005bd3]')} role="status" aria-live="polite">Drop blocks here</div>;
}

function TreeItem({ block, definitions, selectedId, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [expanded, setExpanded] = useState(true);
  const definition = definitions.find(item => item.name === block.type);
  const title = definition?.title ?? block.type;
  const active = selectedId === block.id;
  const hasChildren = Boolean(definition?.supports?.children);

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="grid gap-0.5">
    <div className={cn('group flex min-h-8 items-center rounded-md border border-transparent pr-1 text-[13px] transition-colors hover:bg-[#f1f2f3]', active && 'border-[#a7c7f9] bg-[#eaf4ff] text-[#005bd3]')}>
      {hasChildren ? <button type="button" className="grid size-7 shrink-0 place-items-center text-muted-foreground" onClick={() => setExpanded(value => !value)} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}>{expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</button> : <span className="w-7" />}
      <button type="button" className="min-w-0 flex-1 truncate py-1.5 text-left outline-none" aria-pressed={active} onClick={() => onSelect(block.id)}>{title}</button>
      <Button type="button" variant="ghost" size="icon-sm" className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100" {...attributes} {...listeners} aria-label={`Move ${title}`}><GripVertical className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${title}`}><Copy className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100" onClick={() => onRemove(block.id)} aria-label={`Remove ${title}`}><Trash2 className="size-3.5" /></Button>
    </div>
    {hasChildren && expanded && <div className="ml-5 grid gap-0.5 border-l pl-1.5">{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <ChildDrop blockId={block.id} />}</div>}
  </div>;
}

export function Tree(props: TreeProps) {
  return <SortableContext items={props.blocks.map(block => block.id)} strategy={verticalListSortingStrategy}><div className="grid gap-0.5">{props.blocks.map(block => <TreeItem key={block.id} {...props} block={block} />)}</div></SortableContext>;
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

  return <div className="grid gap-1 pb-3">
    {(['header', 'template', 'footer'] as const).map(region => <section key={region} className="border-b px-2 py-2 last:border-b-0">
      <div className="mb-1 flex h-7 items-center justify-between px-1.5"><span className="text-xs font-semibold capitalize text-[#303030]">{region === 'template' ? 'Template' : region[0].toUpperCase() + region.slice(1)}</span><div className="flex items-center"><Eye className="size-3.5 text-muted-foreground" /><MoreHorizontal className="ml-2 size-3.5 text-muted-foreground" /></div></div>
      {groups[region].length ? <Tree {...props} blocks={groups[region]} /> : <div className="px-2 py-1 text-xs text-muted-foreground">No {region} sections</div>}
      <div className="mt-1">{props.renderAdd(region)}</div>
    </section>)}
  </div>;
}
