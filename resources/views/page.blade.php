<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>body{font-family:system-ui,sans-serif;margin:0;padding:48px;line-height:1.5}[data-block-id]{outline:1px solid transparent}.pb-preview [data-block-id]:hover{outline:2px solid #2563eb;cursor:pointer}.pb-missing{padding:12px;background:#fee2e2;color:#991b1b}</style>
</head>
<body class="{{ $preview ? 'pb-preview' : '' }}">
<main id="pb-canvas">{!! $content !!}</main>
@if($preview)
<script>
const allowedOrigin = window.location.origin;
document.addEventListener('click', (event) => {
  const block = event.target.closest('[data-block-id]');
  if (!block) return;
  window.parent.postMessage({type:'SELECT_BLOCK', blockId:block.dataset.blockId}, allowedOrigin);
});
window.addEventListener('message', (event) => {
  if (event.origin !== allowedOrigin) return;
  if (event.data?.type === 'REPLACE_PAGE') {
    const canvas = document.getElementById('pb-canvas');
    if (canvas) canvas.innerHTML = event.data.html;
    return;
  }
  if (event.data?.type !== 'REPLACE_BLOCK') return;
  const current = document.querySelector(`[data-block-id="${CSS.escape(event.data.blockId)}"]`);
  if (!current) return;
  const template = document.createElement('template');
  template.innerHTML = event.data.html.trim();
  current.replaceWith(template.content.firstElementChild);
});
</script>
@endif
</body>
</html>
