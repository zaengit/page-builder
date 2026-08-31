import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBuilder } from './store';
import type { AttrSchema, BlockDefinition, PageBlock } from './types';
import './style.css';

function defaults(fields:Record<string,AttrSchema> = {}){
  return Object.fromEntries(Object.entries(fields).map(([key,schema])=>[key,schema.default ?? '']));
}

function Control({name,schema,value,onChange}:{name:string;schema:AttrSchema;value:unknown;onChange:(v:unknown)=>void}){
  if(schema.type==='select') return <label>{schema.label??name}<select value={String(value??'')} onChange={e=>{const option=schema.options?.find(o=>String(o)===e.target.value);onChange(option??e.target.value)}}>{schema.options?.map(o=><option key={String(o)} value={String(o)}>{String(o)}</option>)}</select></label>;
  if(schema.type==='boolean') return <label className="check"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/>{schema.label??name}</label>;
  if(schema.type==='textarea') return <label>{schema.label??name}<textarea value={String(value??'')} onChange={e=>onChange(e.target.value)} /></label>;
  if(schema.type==='number'||schema.type==='range') return <label>{schema.label??name}<input type={schema.type==='range'?'range':'number'} min={schema.min} max={schema.max} step={schema.step} value={Number(value??0)} onChange={e=>onChange(Number(e.target.value))}/>{schema.type==='range'&&<span>{String(value??0)}</span>}</label>;
  if(schema.type==='repeater'){
    const items=Array.isArray(value)?value as Array<Record<string,unknown>>:[];
    return <fieldset className="repeater"><legend>{schema.label??name}</legend>{items.map((item,index)=><div className="repeater-item" key={index}><div className="repeater-head"><strong>Item {index+1}</strong><button type="button" onClick={()=>onChange(items.filter((_,i)=>i!==index))}>Remove</button></div>{Object.entries(schema.fields??{}).map(([field,fieldSchema])=><Control key={field} name={field} schema={fieldSchema} value={item[field]} onChange={next=>onChange(items.map((current,i)=>i===index?{...current,[field]:next}:current))}/>)}</div>)}<button type="button" onClick={()=>onChange([...items,defaults(schema.fields)])}>+ Add item</button></fieldset>;
  }
  return <label>{schema.label??name}<input type={schema.type==='url'||schema.type==='image'?'url':'text'} value={String(value??'')} onChange={e=>onChange(e.target.value)} /></label>;
}

function findBlock(blocks:PageBlock[],id:string|null):PageBlock|undefined{
  if(!id)return undefined;
  for(const block of blocks){if(block.id===id)return block;const child=findBlock(block.children??[],id);if(child)return child;}
}

function Tree({blocks,definitions,selectedId,onSelect,onRemove}:{blocks:PageBlock[];definitions:BlockDefinition[];selectedId:string|null;onSelect:(id:string)=>void;onRemove:(id:string)=>void}){
  return <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>{blocks.map(block=><TreeItem key={block.id} block={block} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove}/>)}</SortableContext>;
}

function TreeItem({block,definitions,selectedId,onSelect,onRemove}:{block:PageBlock;definitions:BlockDefinition[];selectedId:string|null;onSelect:(id:string)=>void;onRemove:(id:string)=>void}){
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:block.id});
  const definition=definitions.find(d=>d.name===block.type);
  return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.5:1}} className="tree-node">
    <div className={`tree-row ${selectedId===block.id?'active':''}`}>
      <button className="drag" {...attributes} {...listeners} aria-label={`Move ${definition?.title??block.type}`}>⋮⋮</button>
      <button className="tree-select" onClick={()=>onSelect(block.id)}>{definition?.title??block.type}</button>
      <button className="remove" onClick={()=>onRemove(block.id)} aria-label="Remove block">×</button>
    </div>
    {block.children&&<div className="tree-children"><Tree blocks={block.children} definitions={definitions} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove}/>{block.children.length===0&&<div className="empty-children">Drop/add blocks here</div>}</div>}
  </div>;
}

function App(){
  const {page,definitions,selectedId,dirty,bootstrap,select,addBlock,updateAttrs,moveBlock,removeBlock,save,publish}=useBuilder();
  const iframe=useRef<HTMLIFrameElement>(null);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  const selected=useMemo(()=>findBlock(page?.draft_content.blocks??[],selectedId),[page?.draft_content.blocks,selectedId]);
  const definition=definitions.find(d=>d.name===selected?.type);
  const previewUrl=page?`/preview/${page.id}`:'about:blank';

  useEffect(()=>{bootstrap().catch(console.error)},[]);
  useEffect(()=>{const fn=(e:MessageEvent)=>{if(e.origin!==location.origin||e.data?.type!=='SELECT_BLOCK')return;select(e.data.blockId)};addEventListener('message',fn);return()=>removeEventListener('message',fn)},[select]);

  useEffect(()=>{
    if(!page)return;
    const t=setTimeout(async()=>{
      const res=await fetch('/api/render-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(page.draft_content)}).then(r=>r.json());
      iframe.current?.contentWindow?.postMessage({type:'REPLACE_PAGE',html:res.html,assets:res.assets},location.origin);
    },120);
    return()=>clearTimeout(t);
  },[page?.draft_content]);

  const onDragEnd=({active,over}:DragEndEvent)=>{if(over&&active.id!==over.id)moveBlock(String(active.id),String(over.id));};

  if(!page)return <div className="loading">Loading editor…</div>;
  return <main><header><strong>Page Builder</strong><span>{dirty?'Unsaved changes':'Saved'}</span><button onClick={()=>void save()}>Save</button><button onClick={()=>void publish()}>Publish</button><a href={`http://127.0.0.1:8000/${page.slug}`} target="_blank" rel="noreferrer">View page</a></header><section className="layout">
    <aside><h3>Blocks</h3><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><Tree blocks={page.draft_content.blocks} definitions={definitions} selectedId={selectedId} onSelect={select} onRemove={removeBlock}/></DndContext><select defaultValue="" onChange={e=>{if(e.target.value)addBlock(e.target.value);e.target.value=''}}><option value="">+ Add block</option>{definitions.map(d=><option value={d.name} key={d.name}>{d.title}</option>)}</select>{selected&&definition?.supports?.children&&<select defaultValue="" onChange={e=>{if(e.target.value)addBlock(e.target.value,selected.id);e.target.value=''}}><option value="">+ Add child</option>{definitions.map(d=><option value={d.name} key={d.name}>{d.title}</option>)}</select>}</aside>
    <div className="preview"><iframe ref={iframe} src={previewUrl}/></div>
    <aside><h3>Inspector</h3>{selected&&definition?<><div className="inspector-title">{definition.title}</div>{Object.entries(definition.attributes).map(([name,schema])=><Control key={name} name={name} schema={schema} value={selected.attrs[name]} onChange={v=>updateAttrs(selected.id,{[name]:v})}/>)}</>:<p>Select a block</p>}</aside>
  </section></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
