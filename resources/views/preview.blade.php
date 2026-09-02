<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>html,body{margin:0;min-height:100%}body{font-family:system-ui,sans-serif;line-height:1.5}.pb-preview-block{position:relative}.pb-preview-block:hover{outline:1px solid rgba(37,99,235,.55);outline-offset:1px}.pb-preview-block.pb-selected{outline:2px solid #2563eb;outline-offset:2px}[data-pb-inline="text"]:focus{outline:2px solid #2563eb;outline-offset:2px}.pb-missing{padding:12px;background:#fee2e2;color:#991b1b}</style>
    @foreach (($assets['css'] ?? []) as $href)<link rel="stylesheet" href="{{ $href }}" data-pb-asset="css">@endforeach
</head>
<body class="pb-preview">
<main id="pb-canvas">{!! $content !!}</main>
@foreach (($assets['js'] ?? []) as $src)<script type="module" src="{{ $src }}" data-pb-asset="js"></script>@endforeach
<script>
const allowedOrigin = window.location.origin;
function ensureAssets(assets = {}) {
  for (const href of assets.css ?? []) { if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(node => node.href === new URL(href, location.origin).href)) continue; const link = document.createElement('link'); link.rel='stylesheet'; link.href=href; link.dataset.pbAsset='css'; document.head.appendChild(link); }
  for (const src of assets.js ?? []) { if ([...document.querySelectorAll('script[src]')].some(node => node.src === new URL(src, location.origin).href)) continue; const script=document.createElement('script'); script.type='module'; script.src=src; script.dataset.pbAsset='js'; document.body.appendChild(script); }
}
function selectBlock(id){ document.querySelectorAll('.pb-selected').forEach(node=>node.classList.remove('pb-selected')); const node=document.querySelector(`[data-pb-block-id="${CSS.escape(id)}"]`); if(node) node.classList.add('pb-selected'); }
document.addEventListener('click', event => { const block = event.target.closest('[data-pb-block-id],[data-block-id]'); const id = block?.dataset.pbBlockId || block?.dataset.blockId; if (id) window.parent.postMessage({type:'SELECT_BLOCK', blockId:id}, allowedOrigin); });
document.addEventListener('input', event => { const editable=event.target.closest('[data-pb-inline]'); if(!editable) return; const block=editable.closest('[data-pb-block-id],[data-block-id]'); const blockId=block?.dataset.pbBlockId || block?.dataset.blockId; if(blockId) window.parent.postMessage({type:'PB_INLINE_EDIT',blockId,attribute:editable.dataset.pbInline,value:editable.textContent ?? ''},allowedOrigin); });
window.addEventListener('message', event => {
  if (event.origin !== allowedOrigin) return; ensureAssets(event.data?.assets);
  if(event.data?.type === 'PB_EDITOR_SELECTION'){ selectBlock(event.data.blockId); return; }
  if (event.data?.type === 'REPLACE_PAGE') { const canvas=document.getElementById('pb-canvas'); if(canvas) canvas.innerHTML=event.data.html; return; }
  if (event.data?.type !== 'REPLACE_BLOCK') return;
  const current=document.querySelector(`[data-pb-block-id="${CSS.escape(event.data.blockId)}"],[data-block-id="${CSS.escape(event.data.blockId)}"]`); if(!current) return;
  const template=document.createElement('template'); template.innerHTML=event.data.html.trim(); current.replaceWith(template.content.firstElementChild);
});
</script>
</body>
</html>
