import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useBuilder } from './store';
import type { AttrSchema } from './types';
import './style.css';

function Control({name,schema,value,onChange}:{name:string;schema:AttrSchema;value:unknown;onChange:(v:unknown)=>void}){
  if(schema.type==='select') return <label>{schema.label??name}<select value={String(value??'')} onChange={e=>onChange(isNaN(Number(e.target.value))?e.target.value:Number(e.target.value))}>{schema.options?.map(o=><option key={String(o)} value={String(o)}>{String(o)}</option>)}</select></label>;
  return <label>{schema.label??name}<input value={String(value??'')} onChange={e=>onChange(e.target.value)} /></label>;
}

function App(){
  const {page,definitions,selectedId,dirty,bootstrap,select,addBlock,updateAttrs,save,publish}=useBuilder();
  const iframe=useRef<HTMLIFrameElement>(null);
  const selected=page?.draft_content.blocks.find(b=>b.id===selectedId);
  const definition=definitions.find(d=>d.name===selected?.type);
  const previewUrl=page?`/preview/${page.id}`:'about:blank';
  useEffect(()=>{bootstrap().catch(console.error)},[]);
  useEffect(()=>{const fn=(e:MessageEvent)=>{if(e.origin!==location.origin||e.data?.type!=='SELECT_BLOCK')return;select(e.data.blockId)};addEventListener('message',fn);return()=>removeEventListener('message',fn)},[select]);
  const renderSelected=async()=>{if(!selected)return;const res=await fetch('/api/render-block',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(selected)}).then(r=>r.json());iframe.current?.contentWindow?.postMessage({type:'REPLACE_BLOCK',blockId:selected.id,html:res.html},location.origin)};
  useEffect(()=>{const t=setTimeout(()=>void renderSelected(),150);return()=>clearTimeout(t)},[selected?.attrs]);
  if(!page)return <div className="loading">Loading editor…</div>;
  return <main><header><strong>Page Builder</strong><span>{dirty?'Unsaved changes':'Saved'}</span><button onClick={()=>void save()}>Save</button><button onClick={()=>void publish()}>Publish</button><a href={`http://127.0.0.1:8000/${page.slug}`} target="_blank">View page</a></header><section className="layout"><aside><h3>Blocks</h3>{page.draft_content.blocks.map(b=><button className={b.id===selectedId?'active':''} onClick={()=>select(b.id)} key={b.id}>{definitions.find(d=>d.name===b.type)?.title??b.type}</button>)}<select defaultValue="" onChange={e=>{if(e.target.value)addBlock(e.target.value);e.target.value=''}}><option value="">+ Add block</option>{definitions.map(d=><option value={d.name} key={d.name}>{d.title}</option>)}</select></aside><div className="preview"><iframe ref={iframe} src={previewUrl}/></div><aside><h3>Inspector</h3>{selected&&definition?Object.entries(definition.attributes).map(([name,schema])=><Control key={name} name={name} schema={schema} value={selected.attrs[name]} onChange={v=>updateAttrs(selected.id,{[name]:v})}/>):<p>Select a block</p>}</aside></section></main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
