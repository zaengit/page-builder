<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>body{font-family:system-ui,sans-serif;margin:0;padding:48px;line-height:1.5}[data-block-id]{outline:1px solid transparent}.pb-preview [data-block-id]:hover{outline:2px solid #2563eb;cursor:pointer}.pb-missing{padding:12px;background:#fee2e2;color:#991b1b}</style>
    @foreach (($assets['css'] ?? []) as $href)
        <link rel="stylesheet" href="{{ $href }}" data-pb-asset="css">
    @endforeach
</head>
<body class="{{ $preview ? 'pb-preview' : '' }}">
<main id="pb-canvas">{!! $content !!}</main>
@foreach (($assets['js'] ?? []) as $src)
    <script type="module" src="{{ $src }}" data-pb-asset="js"></script>
@endforeach
@if($preview)
<script>
const allowedOrigin = window.location.origin;

function ensureAssets(assets = {}) {
  for (const href of assets.css ?? []) {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(node => node.href === new URL(href, location.origin).href)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.pbAsset = 'css';
    document.head.appendChild(link);
  }

  for (const src of assets.js ?? []) {
    if ([...document.querySelectorAll('script[src]')].some(node => node.src === new URL(src, location.origin).href)) continue;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.dataset.pbAsset = 'js';
    document.body.appendChild(script);
  }
}

document.addEventListener('click', (event) => {
  const block = event.target.closest('[data-block-id]');
  if (!block) return;
  window.parent.postMessage({type:'SELECT_BLOCK', blockId:block.dataset.blockId}, allowedOrigin);
});

window.addEventListener('message', (event) => {
  if (event.origin !== allowedOrigin) return;
  ensureAssets(event.data?.assets);

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
