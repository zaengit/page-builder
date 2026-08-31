import React, {useEffect, useState} from 'https://esm.sh/react@19.2.8';
import {createRoot} from 'https://esm.sh/react-dom@19.2.8/client';

const mounted = new WeakMap();

function Carousel({items, autoplay, interval}) {
  const slides = Array.isArray(items) ? items : [];
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count === 0) setIndex(0);
    else if (index >= count) setIndex(count - 1);
  }, [count, index]);

  useEffect(() => {
    if (!autoplay || count < 2) return undefined;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % count), Math.max(1000, Math.min(15000, Number(interval) || 4000)));
    return () => window.clearInterval(timer);
  }, [autoplay, count, interval]);

  if (count === 0) {
    return React.createElement('p', {className: 'pb-carousel__empty'}, 'Add at least one slide in the inspector.');
  }

  const track = React.createElement(
    'div',
    {
      className: 'pb-carousel__js-track',
      style: {transform: `translateX(-${index * 100}%)`},
      'aria-live': 'polite',
    },
    slides.map((item, slideIndex) => React.createElement(
      'article',
      {className: 'pb-carousel__slide', key: `${slideIndex}-${item?.title ?? ''}`},
      item?.image ? React.createElement('img', {src: String(item.image), alt: String(item?.title ?? ''), loading: 'lazy'}) : null,
      React.createElement(
        'div',
        {className: 'pb-carousel__copy'},
        React.createElement('h3', null, String(item?.title ?? '')),
        item?.description ? React.createElement('p', null, String(item.description)) : null,
      ),
    )),
  );

  if (count < 2) return track;

  return React.createElement(
    React.Fragment,
    null,
    track,
    React.createElement(
      'div',
      {className: 'pb-carousel__controls'},
      React.createElement('button', {type: 'button', onClick: () => setIndex(current => (current - 1 + count) % count), 'aria-label': 'Previous slide'}, 'Previous'),
      React.createElement(
        'div',
        {className: 'pb-carousel__dots', 'aria-label': 'Choose slide'},
        slides.map((_, dotIndex) => React.createElement('button', {
          type: 'button',
          className: 'pb-carousel__dot',
          key: dotIndex,
          'aria-label': `Go to slide ${dotIndex + 1}`,
          'aria-current': dotIndex === index ? 'true' : 'false',
          onClick: () => setIndex(dotIndex),
        })),
      ),
      React.createElement('button', {type: 'button', onClick: () => setIndex(current => (current + 1) % count), 'aria-label': 'Next slide'}, 'Next'),
    ),
  );
}

function mount(root) {
  if (!(root instanceof HTMLElement) || mounted.has(root)) return;
  const host = root.querySelector('[data-carousel-island]');
  if (!(host instanceof HTMLElement)) return;

  let props = {};
  try {
    props = JSON.parse(root.dataset.props || '{}');
  } catch {
    props = {};
  }

  const reactRoot = createRoot(host);
  reactRoot.render(React.createElement(Carousel, props));
  mounted.set(root, reactRoot);
}

function scan(scope = document) {
  if (scope instanceof HTMLElement && scope.matches('[data-block="core/carousel"]')) mount(scope);
  scope.querySelectorAll?.('[data-block="core/carousel"]').forEach(mount);
}

scan();

new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof HTMLElement) scan(node);
    }
  }
}).observe(document.documentElement, {childList: true, subtree: true});

export {mount};
