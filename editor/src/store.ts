import { create } from 'zustand';
import type { BlockDefinition, Page, PageBlock, PageContent } from './types';

type State = {
  page: Page | null; definitions: BlockDefinition[]; selectedId: string | null; dirty: boolean;
  bootstrap(): Promise<void>; select(id:string):void; addBlock(type:string):void; updateAttrs(id:string,attrs:Record<string,unknown>):void; save():Promise<void>; publish():Promise<void>;
};

const defaultContent: PageContent = {blocks:[{id:crypto.randomUUID(),type:'core/heading',attrs:{text:'Hello World',level:2,alignment:'left'}}]};

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
  addBlock(type){ const s=get(); if(!s.page) return; const def=s.definitions.find(d=>d.name===type); const attrs=Object.fromEntries(Object.entries(def?.attributes??{}).map(([k,v])=>[k,v.default])); const block={id:crypto.randomUUID(),type,attrs}; set({page:{...s.page,draft_content:{blocks:[...s.page.draft_content.blocks,block]}},selectedId:block.id,dirty:true}); },
  updateAttrs(id,attrs){const s=get(); if(!s.page)return; set({page:{...s.page,draft_content:{blocks:s.page.draft_content.blocks.map(b=>b.id===id?{...b,attrs:{...b.attrs,...attrs}}:b)}},dirty:true});},
  async save(){const s=get(); if(!s.page)return; const page=await fetch(`/api/pages/${s.page.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:s.page.draft_content})}).then(r=>r.json()); set({page,dirty:false});},
  async publish(){await get().save(); const s=get(); if(!s.page)return; const page=await fetch(`/api/pages/${s.page.id}/publish`,{method:'POST'}).then(r=>r.json()); set({page});}
}));
