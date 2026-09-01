import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  return <div ref={setNodeRef} data-drop-id={dropId} className={`child-drop ${isOver ? 'over' : ''}`} role="status" aria-live="polite">Drop blocks here</div>;
}

function TreeItem({ block, definitions, selectedId, onSelect, onRemove, onDuplicate }: TreeProps & { block: PageBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const definition = definitions.find(item => item.name === block.type);

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .45 : 1 }} className="tree-node">
    <div className={`tree-row ${selectedId === block.id ? 'active' : ''}`}>
      <button type="button" className="drag" {...attributes} {...listeners} aria-label={`Move ${definition?.title ?? block.type}`}>⋮⋮</button>
      <button type="button" className="tree-select" aria-pressed={selectedId === block.id} onClick={() => onSelect(block.id)}>{definition?.title ?? block.type}</button>
      <button type="button" className="duplicate" onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${definition?.title ?? block.type}`}>⧉</button>
      <button type="button" className="remove" onClick={() => onRemove(block.id)} aria-label={`Remove ${definition?.title ?? block.type}`}>×</button>
    </div>
    {definition?.supports?.children && <div className="tree-children">{block.children?.length ? <Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} onDuplicate={onDuplicate} /> : <ChildDrop blockId={block.id} />}</div>}
  </div>;
}

export function Tree(props: TreeProps) {
  return <SortableContext items={props.blocks.map(block => block.id)} strategy={verticalListSortingStrategy}>{props.blocks.map(block => <TreeItem key={block.id} {...props} block={block} />)}</SortableContext>;
}
