import { create } from 'zustand';
import type { BlockDefinition, PageBlock, PageContent } from './types';

type State = {
  content: PageContent;
  definitions: BlockDefinition[];
  selectedId: string | null;
  dirty: boolean;
  past: PageContent[];
  future: PageContent[];
  initialSnapshot: string;
  bootstrap(): Promise<void>;
  replaceContent(content:PageContent):void;
  markClean():void;
  select(id:string):void;
  addBlock(type:string,parentId?:string|null):void;
  updateAttrs(id:string,attrs:Record<string,unknown>):void;
  moveBlock(activeId:string,overId:string):void;
  removeBlock(id:string):void;
  undo():void;
  redo():void;
};

const HISTORY_LIMIT = 100;
const defaultContent: PageContent = {blocks:[{id:crypto.randomUUID(),type:'core/heading',attrs:{text:'Hello World',level:2,alignment:'left'}}]};
const snapshot = (content:PageContent) => JSON.stringify(content);

async function api<T>(url:string, init:RequestInit = {}):Promise<T>{
  const headers = new Headers(init.headers);
  headers.set('Accept','application/json');
  if(init.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const response = await fetch(url,{...init,headers});
  if(!response.ok){
    const body = await response.json().catch(()=>({message:'Request failed'}));
    const details = Object.values(body.errors ?? {}).flat().join(' ');
    throw new Error(details || body.message || 'Request failed');
  }
  return response.json();
}

function findBlock(blocks:PageBlock[], id:string):PageBlock|null {
  for(const block of blocks){
    if(block.id===id) return block;
    const child=findBlock(block.children??[],id);
    if(child) return child;
  }
  return null;
}

function updateBlock(blocks:PageBlock[], id:string, updater:(block:PageBlock)=>PageBlock):PageBlock[]{
  return blocks.map(block=>block.id===id?updater(block):{...block,children:block.children?updateBlock(block.children,id,updater):block.children});
}

function removeFromTree(blocks:PageBlock[], id:string):{blocks:PageBlock[];removed:PageBlock|null}{
  const index=blocks.findIndex(block=>block.id===id);
  if(index>=0){
    const next=[...blocks];
    const [removed]=next.splice(index,1);
    return {blocks:next,removed};
  }
  for(const block of blocks){
    const result=removeFromTree(block.children??[],id);
    if(result.removed){
      return {blocks:blocks.map(item=>item.id===block.id?{...item,children:result.blocks}:item),removed:result.removed};
    }
  }
  return {blocks,removed:null};
}

function findParentId(blocks:PageBlock[], id:string, parentId:string|null=null):string|null|undefined {
  for(const block of blocks){
    if(block.id===id) return parentId;
    const found=findParentId(block.children??[],id,block.id);
    if(found!==undefined) return found;
  }
  return undefined;
}

function insertBefore(blocks:PageBlock[], targetId:string, blockToInsert:PageBlock):PageBlock[]{
  const index=blocks.findIndex(block=>block.id===targetId);
  if(index<0)return blocks;
  const next=[...blocks];
  next.splice(index,0,blockToInsert);
  return next;
}

function historyUpdate(state:State, nextContent:PageContent, selectedId=state.selectedId){
  if(snapshot(state.content)===snapshot(nextContent)) return null;
  return {
    content:nextContent,
    selectedId,
    past:[...state.past,state.content].slice(-HISTORY_LIMIT),
    future:[],
    dirty:snapshot(nextContent)!==state.initialSnapshot,
  };
}

export const useBuilder = create<State>((set,get)=>({
  content:defaultContent,
  definitions:[],
  selectedId:defaultContent.blocks[0]?.id ?? null,
  dirty:false,
  past:[],
  future:[],
  initialSnapshot:snapshot(defaultContent),

  async bootstrap(){
    const definitions = await api<BlockDefinition[]>('/api/page-builder/blocks');
    set({definitions});
  },

  replaceContent(content){
    const next = content && Array.isArray(content.blocks) ? content : {blocks:[]};
    set({content:next,selectedId:next.blocks[0]?.id ?? null,dirty:false,past:[],future:[],initialSnapshot:snapshot(next)});
  },

  markClean(){
    const s=get();
    set({dirty:false,initialSnapshot:snapshot(s.content)});
  },

  select(selectedId){set({selectedId});},

  addBlock(type,parentId){
    const s=get();
    const def=s.definitions.find(d=>d.name===type);
    if(!def)return;
    const attrs=Object.fromEntries(Object.entries(def.attributes??{}).map(([k,v])=>[k,v.default]));
    const block:PageBlock={id:crypto.randomUUID(),type,attrs,...(def.supports?.children?{children:[]}: {})};
    const selected=s.selectedId?findBlock(s.content.blocks,s.selectedId):null;
    const selectedDef=s.definitions.find(d=>d.name===selected?.type);
    const targetParent=parentId!==undefined?parentId:(selected&&selectedDef?.supports?.children?selected.id:null);
    const blocks=targetParent
      ? updateBlock(s.content.blocks,targetParent,parent=>({...parent,children:[...(parent.children??[]),block]}))
      : [...s.content.blocks,block];
    const update=historyUpdate(s,{blocks},block.id); if(update)set(update);
  },

  updateAttrs(id,attrs){
    const s=get();
    const blocks=updateBlock(s.content.blocks,id,b=>({...b,attrs:{...b.attrs,...attrs}}));
    const update=historyUpdate(s,{blocks}); if(update)set(update);
  },

  moveBlock(activeId,overId){
    if(activeId===overId)return;
    const s=get();
    const blocks=s.content.blocks;
    const active=findBlock(blocks,activeId); const over=findBlock(blocks,overId);
    if(!active||!over||findBlock(active.children??[],overId))return;
    const overParent=findParentId(blocks,overId);
    const removed=removeFromTree(blocks,activeId);
    if(!removed.removed)return;
    let next=removed.blocks;
    if(overParent===null) next=insertBefore(next,overId,removed.removed);
    else if(overParent!==undefined) next=updateBlock(next,overParent,parent=>({...parent,children:insertBefore(parent.children??[],overId,removed.removed!)}));
    const update=historyUpdate(s,{blocks:next}); if(update)set(update);
  },

  removeBlock(id){
    const s=get();
    const result=removeFromTree(s.content.blocks,id);
    if(!result.removed)return;
    const selectedId=s.selectedId===id||Boolean(s.selectedId&&findBlock(result.removed.children??[],s.selectedId))?null:s.selectedId;
    const update=historyUpdate(s,{blocks:result.blocks},selectedId); if(update)set(update);
  },

  undo(){
    const s=get(); if(s.past.length===0)return;
    const previous=s.past[s.past.length-1];
    const selectedId=s.selectedId&&findBlock(previous.blocks,s.selectedId)?s.selectedId:null;
    set({content:previous,past:s.past.slice(0,-1),future:[s.content,...s.future].slice(0,HISTORY_LIMIT),selectedId,dirty:snapshot(previous)!==s.initialSnapshot});
  },

  redo(){
    const s=get(); if(s.future.length===0)return;
    const next=s.future[0];
    const selectedId=s.selectedId&&findBlock(next.blocks,s.selectedId)?s.selectedId:null;
    set({content:next,past:[...s.past,s.content].slice(-HISTORY_LIMIT),future:s.future.slice(1),selectedId,dirty:snapshot(next)!==s.initialSnapshot});
  },
}));
