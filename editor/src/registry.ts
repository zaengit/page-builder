import type { InspectorControl } from './types';

const controls = new Map<string, InspectorControl>();
const categories = new Map<string, string>();

export type PageBuilderApi = {
  registerControl: (type: string, control: InspectorControl) => void;
  registerCategory: (slug: string, title: string) => void;
};

export function getControl(type: string): InspectorControl | undefined {
  return controls.get(type);
}

export function getCategoryTitle(slug: string): string | undefined {
  return categories.get(slug);
}

export function initializeExtensionApi(): PageBuilderApi {
  const api: PageBuilderApi = {
    registerControl: (type, control) => controls.set(type, control),
    registerCategory: (slug, title) => categories.set(slug, title),
  };

  window.PageBuilder = api;
  window.dispatchEvent(new CustomEvent('page-builder:ready', { detail: api }));
  return api;
}
