import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
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
  return <div ref={setNodeRef} data-drop-id={dropId} className={cn('rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground transition-colors', isOver && 'border-primary bg-primary/5 text-primary')} role="status" aria-live="polite">Drop blocks here</div>;
}

function TreeItem({ block, definitions, selectedId, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const definition = definitions.find(item => item.name === block.type);
  const title = definition?.title ?? block.type;
  const active = selectedId === block.id;

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="grid gap-1.5">
    <div className={cn('group flex items-center gap-1 rounded-lg border border-transparent p-1 transition-colors hover:bg-muted/70', active && 'border-border bg-accent shadow-xs')}>
      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" {...attributes} {...listeners} aria-label={`Move ${title}`}><GripVertical /></Button>
      <button type="button" className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm font-medium outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]" aria-pressed={active} onClick={() => onSelect(block.id)}>{title}</button>
      <Button type="button" variant="ghost" size="icon-sm" className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${title}`}><Copy /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100" onClick={() => onRemove(block.id)} aria-label={`Remove ${title}`}><Trash2 /></Button>
    </div>
    {definition?.supports?.children && <div className="ml-4 grid gap-1.5 border-l pl-3">{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <ChildDrop blockId={block.id} />}</div>}
  </div>;
}

export function Tree(props: TreeProps) {
  return <SortableContext items={props.blocks.map(block => block.id)} strategy={verticalListSortingStrategy}><div className="grid gap-1.5">{props.blocks.map(block => <TreeItem key={block.id} {...props} block={block} />)}</div></SortableContext>;
}
