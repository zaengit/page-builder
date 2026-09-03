import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const RAW = /\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}/g;
const INTERPOLATION = /\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*["']([^"']*)["'])?\s*\}\}/g;
const CONDITION = /\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
const LOOP = /\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;
const BLOCK_NAME = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const TEMPLATE_FILE = /^[A-Za-z0-9._-]+\.html$/;

function resolve(context, path) {
  if (!path) return context;
  return path.split('.').reduce((value, key) => value != null && typeof value === 'object' ? value[key] : undefined, context);
}
function truthy(value) { return Array.isArray(value) ? value.length > 0 : Boolean(value); }
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

export async function loadRegistry(root) {
  const registry = {};
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    let manifest;
    try { manifest = JSON.parse(await readFile(join(directory, 'block.json'), 'utf8')); }
    catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
    manifest.version ??= 1;
    if (!BLOCK_NAME.test(manifest.name ?? '')) throw new Error(`Invalid block name in ${directory}`);
    if (registry[manifest.name]) throw new Error(`Duplicate block ${manifest.name}`);
    const templateFile = manifest.template ?? 'template.html';
    if (!TEMPLATE_FILE.test(templateFile)) throw new Error(`Invalid portable template for ${manifest.name}`);
    const template = await readFile(join(directory, templateFile), 'utf8');
    registry[manifest.name] = { ...manifest, template, _directory: directory };
  }
  return registry;
}

function defaults(definition) {
  const result = {};
  for (const [key, schema] of Object.entries(definition.attributes ?? {})) {
    if (schema && typeof schema === 'object' && Object.hasOwn(schema, 'default')) result[key] = schema.default;
  }
  return result;
}
function resolveContextBindings(attrs, bindings, context) {
  const result = { ...attrs };
  for (const [attribute, binding] of Object.entries(bindings ?? {})) {
    if (!binding || typeof binding !== 'object' || binding.source !== 'context') continue;
    let value = resolve(context, String(binding.path ?? ''));
    if (value == null && Object.hasOwn(binding, 'fallback')) value = binding.fallback;
    if (value != null) result[attribute] = value;
  }
  return result;
}
function wrapBlock(block, html) {
  const id = escapeHtml(block.id ?? '');
  const compiled = block._render;
  if (!compiled || typeof compiled !== 'object') return `<div data-pb-id="${id}">${html}</div>`;
  const slot = compiled.slot != null ? ` data-pb-slot="${escapeHtml(compiled.slot)}"` : '';
  const scheme = compiled.colorSchemeId
    ? ` class="pb-color-scheme--${escapeHtml(compiled.colorSchemeId)}" data-pb-color-scheme="${escapeHtml(compiled.colorSchemeId)}"`
    : '';
  const style = escapeHtml(compiled.style ?? '');
  const responsive = compiled.css
    ? `<style data-pb-responsive="${id}">${String(compiled.css).replaceAll('</style', '')}</style>`
    : '';
  return `<div data-pb-style-id="${id}" data-pb-id="${id}"${scheme}${slot} style="${style}">${html}</div>${responsive}`;
}
function wrapPage(page, body) {
  const compiled = page._pageRender;
  if (!compiled || typeof compiled !== 'object') return `<div class="pb-page">${body}</div>`;
  const className = escapeHtml(compiled.class ?? 'pb-page');
  const style = escapeHtml(compiled.style ?? '');
  const schemeCss = compiled.colorSchemeCss ? `<style data-pb-color-schemes>${String(compiled.colorSchemeCss).replaceAll('</style', '')}</style>` : '';
  const typographyCss = compiled.typographyCss ? `<style data-pb-typography>${String(compiled.typographyCss).replaceAll('</style', '')}</style>` : '';
  const customCss = compiled.customCss ? `<style data-pb-page-css>${String(compiled.customCss).replaceAll('</style', '').replaceAll('<script', '')}</style>` : '';
  return `<div class="${className}" style="${style}">${body}</div>${schemeCss}${typographyCss}${customCss}`;
}

export class UniversalRenderer {
  render({ page, registry, context = {} }) {
    const assets = { css: [], js: [] };
    const diagnostics = [];
    const seen = { css: new Set(), js: new Set() };
    const collect = definition => {
      for (const kind of ['css', 'js']) for (const asset of definition.assets?.[kind] ?? []) {
        if (!seen[kind].has(asset)) { seen[kind].add(asset); assets[kind].push(asset); }
      }
    };
    const renderBlock = block => {
      const definition = registry[block.type];
      if (!definition) { diagnostics.push(`unknown_block:${block.type ?? ''}`); return ''; }
      collect(definition);
      const attrs = resolveContextBindings({ ...defaults(definition), ...(block.attrs ?? {}) }, block.bindings, context);
      const children = (block.children ?? []).map(renderBlock).join('');
      const html = renderTemplate(definition.template ?? '', {
        attrs, context, children, blockId: block.id ?? '', slot: block.slot ?? null, preview: false,
      });
      return wrapBlock(block, html);
    };
    const body = (page.blocks ?? []).map(renderBlock).join('');
    return { html: wrapPage(page, body), assets, diagnostics };
  }
}
