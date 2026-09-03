<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>html,body{margin:0;min-height:100%}body{font-family:system-ui,sans-serif;line-height:1.5}.pb-preview-block{position:relative}.pb-preview-block:hover{outline:1px solid rgba(37,99,235,.55);outline-offset:1px}.pb-preview-block.pb-selected{outline:2px solid #2563eb;outline-offset:2px}[data-pb-inline="text"]:focus{outline:2px solid #2563eb;outline-offset:2px}.pb-missing{padding:12px;background:#fee2e2;color:#991b1b}.pb-canvas-toolbar{position:fixed;z-index:2147483647;display:none;gap:2px;padding:3px;border:1px solid #d4d4d8;border-radius:7px;background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.12)}.pb-canvas-toolbar button{height:24px;border:0;border-radius:5px;background:transparent;padding:0 8px;font:500 11px system-ui;cursor:pointer}.pb-canvas-toolbar button:hover{background:#f4f4f5}.pb-canvas-toolbar button[data-action="remove"]{color:#b91c1c}</style>
    @foreach (($assets['css'] ?? []) as $href)<link rel="stylesheet" href="{{ $href }}" data-pb-asset="css">@endforeach
</head>
<body class="pb-preview">
<main id="pb-canvas">{!! $content !!}</main>
<div id="pb-canvas-toolbar" class="pb-canvas-toolbar" role="toolbar" aria-label="Block actions"><button type="button" data-action="duplicate">Duplicate</button><button type="button" data-action="remove">Delete</button></div>
@foreach (($assets['js'] ?? []) as $src)<script type="module" src="{{ $src }}" data-pb-asset="js"></script>@endforeach
<script>
const allowedOrigin = window.location.origin;
const toolbar = document.getElementById('pb-canvas-toolbar');
let selectedId = null;
function ensureAssets(assets = {}) {
  for (const href of assets.css ?? []) { if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(node => node.href === new URL(href, location.origin).href)) continue; const link = document.createElement('link'); link.rel='stylesheet'; link.href=href; link.dataset.pbAsset='css'; document.head.appendChild(link); }
  for (const src of assets.js ?? []) { if ([...document.querySelectorAll('script[src]')].some(node => node.src === new URL(src, location.origin).href)) continue; const script=document.createElement('script'); script.type='module'; script.src=src; script.dataset.pbAsset='js'; document.body.appendChild(script); }
}
function positionToolbar(node){ if(!toolbar || !node){ if(toolbar) toolbar.style.display='none'; return; } const rect=node.getBoundingClientRect(); toolbar.style.display='flex'; toolbar.style.left=Math.max(6,Math.min(innerWidth-toolbar.offsetWidth-6,rect.left))+'px'; toolbar.style.top=Math.max(6,rect.top-toolbar.offsetHeight-6)+'px'; }
function selectBlock(id){ selectedId=id; document.querySelectorAll('.pb-selected').forEach(node=>node.classList.remove('pb-selected')); const node=document.querySelector(`[data-pb-block-id="${CSS.escape(id)}"]`); if(node){ node.classList.add('pb-selected'); positionToolbar(node); } else positionToolbar(null); }
document.addEventListener('click', event => { if(event.target.closest('#pb-canvas-toolbar')) return; const block = event.target.closest('[data-pb-block-id],[data-block-id]'); const id = block?.dataset.pbBlockId || block?.dataset.blockId; if (id) window.parent.postMessage({type:'SELECT_BLOCK', blockId:id}, allowedOrigin); });
toolbar?.addEventListener('click', event => { const button=event.target.closest('button[data-action]'); if(button && selectedId) window.parent.postMessage({type:'PB_TOOLBAR_ACTION',blockId:selectedId,action:button.dataset.action},allowedOrigin); });
document.addEventListener('input', event => { const editable=event.target.closest('[data-pb-inline]'); if(!editable) return; const block=editable.closest('[data-pb-block-id],[data-block-id]'); const blockId=block?.dataset.pbBlockId || block?.dataset.blockId; if(blockId) window.parent.postMessage({type:'PB_INLINE_EDIT',blockId,attribute:editable.dataset.pbInline,value:editable.textContent ?? ''},allowedOrigin); });
addEventListener('scroll',()=>{ if(selectedId) positionToolbar(document.querySelector(`[data-pb-block-id="${CSS.escape(selectedId)}"]`)); },true); addEventListener('resize',()=>{ if(selectedId) positionToolbar(document.querySelector(`[data-pb-block-id="${CSS.escape(selectedId)}"]`)); });
window.addEventListener('message', event => {
  if (event.origin !== allowedOrigin) return; ensureAssets(event.data?.assets);
  if(event.data?.type === 'PB_EDITOR_SELECTION'){ selectBlock(event.data.blockId); return; }
  if (event.data?.type === 'REPLACE_PAGE') { const canvas=document.getElementById('pb-canvas'); if(canvas) canvas.innerHTML=event.data.html; if(selectedId) selectBlock(selectedId); return; }
  if (event.data?.type !== 'REPLACE_BLOCK') return;
  const current=document.querySelector(`[data-pb-block-id="${CSS.escape(event.data.blockId)}"],[data-block-id="${CSS.escape(event.data.blockId)}"]`); if(!current) return;
  const template=document.createElement('template'); template.innerHTML=event.data.html.trim(); current.replaceWith(template.content.firstElementChild); if(selectedId) selectBlock(selectedId);
});
</script>
</body>
</html>
