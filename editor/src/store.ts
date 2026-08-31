import { create } from 'zustand';
import type { BlockDefinition, Page, PageBlock, PageContent } from './types';

type State = {
  page: Page | null;
  definitions: BlockDefinition[];
  selectedId: string | null;
  dirty: boolean;
  bootstrap(): Promise<void>;
  select(id:string):void;
  addBlock(type:string,parentId?:string|null):void;
  updateAttrs(id:string,attrs:Record<string,unknown>):void;
  moveBlock(activeId:string,overId:string):void;
  removeBlock(id:string):void;
  save():Promise<void>;
  publish():Promise<void>;
};

const defaultContent: PageContent = {blocks:[{id:crypto.randomUUID(),type:'core/heading',attrs:{text:'Hello World',level:2,alignment:'left'}}]};

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

function removeFromTree(blocks:PageBlock[], id:string):{blocks:PageBlock[];removed:PageBlock|null;parentId:string|null}{
  const index=blocks.findIndex(block=>block.id===id);
  if(index>=0){
    const next=[...blocks];
    const [removed]=next.splice(index,1);
    return {blocks:next,removed,parentId:null};
  }
  for(const block of blocks){
    const result=removeFromTree(block.children??[],id);
    if(result.removed){
      return {blocks:blocks.map(item=>item.id===block.id?{...item,children:result.blocks}:item),removed:result.removed,parentId:block.id};
    }
  }
  return {blocks,removed:null,parentId:null};
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
  if(index>=0){const next=[...blocks];next.splice(index,0,blockToInsert);return next;}
  return blocks.map(block=>({...block,children:block.children?insertBefore(block.children,targetId,blockToInsert):block.children}));
}

export const useBuilder = create<State>((set,get)=>({
  page:null,definitions:[],selectedId:null,dirty:false,
  async bootstrap(){
    const definitions = await fetch('/api/blocks').then(r=>r.json());
    const queryId = new URLSearchParams(location.search).get('page');
    let page: Page;
    if(queryId){ page = await fetch(`/api/pages/${queryId}`).then(r=>{if(!r.ok) throw new Error('Page not found'); return r.json();}); }
    else { page = await fetch('/api/pages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Home',slug:`home-${Date.now()}`,content:defaultContent})}).then(r=>r.json()); history.replaceState(null,'',`?page=${page.id}`); }
    set({definitions,page,selectedId:page.draft_content.blocks[0]?.id ?? null});
  },
  select(selectedId){set({selectedId});},
  addBlock(type,parentId){
    const s=get(); if(!s.page) return;
    const def=s.definitions.find(d=>d.name===type);
    const attrs=Object.fromEntries(Object.entries(def?.attributes??{}).map(([k,v])=>[k,v.default]));
    const block:PageBlock={id:crypto.randomUUID(),type,attrs,...(def?.supports?.children?{children:[]}: {})};
    const selected= s.selectedId ? findBlock(s.page.draft_content.blocks,s.selectedId) : null;
    const selectedDef=s.definitions.find(d=>d.name===selected?.type);
    const targetParent=parentId!==undefined?parentId:(selected&&selectedDef?.supports?.children?selected.id:null);
    const blocks=targetParent
      ? updateBlock(s.page.draft_content.blocks,targetParent,parent=>({...parent,children:[...(parent.children??[]),block]}))
      : [...s.page.draft_content.blocks,block];
    set({page:{...s.page,draft_content:{blocks}},selectedId:block.id,dirty:true});
  },
  updateAttrs(id,attrs){const s=get(); if(!s.page)return; const blocks=updateBlock(s.page.draft_content.blocks,id,b=>({...b,attrs:{...b.attrs,...attrs}})); set({page:{...s.page,draft_content:{blocks}},dirty:true});},
  moveBlock(activeId,overId){
    if(activeId===overId)return;
    const s=get(); if(!s.page)return;
    const blocks=s.page.draft_content.blocks;
    const active=findBlock(blocks,activeId); const over=findBlock(blocks,overId);
    if(!active||!over)return;
    const activeContainsOver=!!findBlock(active.children??[],overId);
    if(activeContainsOver)return;
    const overParent=findParentId(blocks,overId);
    const removed=removeFromTree(blocks,activeId);
    if(!removed.removed)return;
    let next=removed.blocks;
    if(overParent===null){next=insertBefore(next,overId,removed.removed);}
    else if(overParent!==undefined){next=updateBlock(next,overParent,parent=>({...parent,children:insertBefore(parent.children??[],overId,removed.removed!)}));}
    set({page:{...s.page,draft_content:{blocks:next}},dirty:true});
  },
  removeBlock(id){const s=get();if(!s.page)return;const result=removeFromTree(s.page.draft_content.blocks,id);if(!result.removed)return;set({page:{...s.page,draft_content:{blocks:result.blocks}},selectedId:s.selectedId===id?null:s.selectedId,dirty:true});},
  async save(){const s=get(); if(!s.page)return; const page=await fetch(`/api/pages/${s.page.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:s.page.draft_content})}).then(r=>r.json()); set({page,dirty:false});},
  async publish(){await get().save(); const s=get(); if(!s.page)return; const page=await fetch(`/api/pages/${s.page.id}/publish`,{method:'POST'}).then(r=>r.json()); set({page});}
}));
