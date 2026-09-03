const RAW = /\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}/g;
const INTERPOLATION = /\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*["']([^"']*)["'])?\s*\}\}/g;
const CONDITION = /\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
const LOOP = /\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;

function resolve(context, path) {
  return path.split('.').reduce((value, key) => value != null && typeof value === 'object' ? value[key] : undefined, context);
}
function truthy(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
export function renderTemplate(template, context) {
  let output = template;
  while (LOOP.test(output)) {
    LOOP.lastIndex = 0;
    output = output.replace(LOOP, (_, variable, path, body) => {
      const items = resolve(context, path);
      if (!Array.isArray(items)) return '';
      return items.map((item, index) => renderTemplate(body, {
        ...context,
        [variable]: item,
        loop: { index, number: index + 1, first: index === 0, last: index === items.length - 1, count: items.length },
      })).join('');
    });
  }
  while (CONDITION.test(output)) {
    CONDITION.lastIndex = 0;
    output = output.replace(CONDITION, (_, path, body) => truthy(resolve(context, path)) ? renderTemplate(body, context) : '');
  }
  output = output.replace(RAW, (_, path) => resolve(context, path) ?? '');
  return output.replace(INTERPOLATION, (_, path, fallback) => escapeHtml(resolve(context, path) ?? fallback ?? ''));
}

function defaults(definition) {
  const result = {};
  for (const [key, schema] of Object.entries(definition.attributes ?? {})) {
    if (schema && typeof schema === 'object' && Object.hasOwn(schema, 'default')) result[key] = schema.default;
  }
  return result;
}

export class UniversalRenderer {
  render({ page, registry, context = {} }) {
    const assets = { css: [], js: [] };
    const diagnostics = [];
    const seen = { css: new Set(), js: new Set() };
    const collect = definition => {
      for (const kind of ['css', 'js']) {
        for (const asset of definition.assets?.[kind] ?? []) {
          if (!seen[kind].has(asset)) { seen[kind].add(asset); assets[kind].push(asset); }
        }
      }
    };
    const renderBlock = block => {
      const definition = registry[block.type];
      if (!definition) { diagnostics.push(`unknown_block:${block.type ?? ''}`); return ''; }
      collect(definition);
      const attrs = { ...defaults(definition), ...(block.attrs ?? {}) };
      const children = (block.children ?? []).map(renderBlock).join('');
      const html = renderTemplate(definition.template ?? '', {
        attrs, context, children, blockId: block.id ?? '', slot: block.slot ?? null, preview: false,
      });
      return `<div data-pb-id="${escapeHtml(block.id ?? '')}">${html}</div>`;
    };
    const body = (page.blocks ?? []).map(renderBlock).join('');
    return { html: `<div class="pb-page">${body}</div>`, assets, diagnostics };
  }
}
