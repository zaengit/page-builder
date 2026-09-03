import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { CSSProperties, ReactNode } from 'react';
import { layoutItemStyle, responsive, sectionLayoutStyle } from './layout';
import type { Breakpoint, PageBlock } from './types';

export function LayoutContainer({ block, breakpoint, children }: { block: PageBlock; breakpoint: Breakpoint; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `container:${block.id}`, data: { parentId: block.id, type: 'container' } });
  const style = sectionLayoutStyle(block.layout, breakpoint);
  return <div ref={setNodeRef} style={style} className={isOver ? 'ring-2 ring-primary/50 ring-inset' : undefined}>{children}</div>;
}

export function SortableLayoutItem({ block, parent, breakpoint, children }: { block: PageBlock; parent?: PageBlock; breakpoint: Breakpoint; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: block.id, data: { blockId: block.id, parentId: parent?.id ?? null } });
  const parentMode = responsive(parent?.layout?.mode, breakpoint, 'block');
  const style: CSSProperties = {
    ...layoutItemStyle(block.layoutItem, parentMode, breakpoint),
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? .55 : 1,
    position: 'relative',
  };
  return <div ref={setNodeRef} style={style} data-block-id={block.id} data-parent-layout={parentMode} className={isOver ? 'outline outline-2 outline-primary/50 outline-offset-2' : undefined} {...attributes} {...listeners}>{children}</div>;
}

export function GridCellDropIndicator({ parentId, columns, index }: { parentId: string; columns: number; index: number }) {
  const row = Math.floor(index / columns) + 1;
  const column = (index % columns) + 1;
  const { setNodeRef, isOver } = useDroppable({ id: `gridcell:${parentId}:${row}:${column}`, data: { type: 'grid-cell', parentId, row, column } });
  return <div ref={setNodeRef} aria-hidden className={isOver ? 'min-h-8 rounded border-2 border-dashed border-primary bg-primary/5' : 'min-h-8 rounded border border-dashed border-muted-foreground/20'} style={{ gridColumn: column, gridRow: row }} />;
}
