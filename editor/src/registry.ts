import { GlobalTypographyInspector } from './components/TypographyPanel';
import type { BlockEditor, BlockTransform, InspectorControl, InspectorPanelExtension, PageBlock, Pattern, ToolbarAction } from './types';

const controls = new Map<string, InspectorControl>();
const categories = new Map<string, string>();
const blockEditors = new Map<string, BlockEditor>();
const transforms = new Map<string, BlockTransform[]>();
const toolbarActions = new Map<string, ToolbarAction>();
const inspectorPanels = new Map<string, InspectorPanelExtension>([
  ['global-typography', {
    id: 'global-typography',
    title: 'Global typography',
    render: GlobalTypographyInspector,
  }],
]);
const patterns = new Map<string, Pattern>();

export type PageBuilderApi = {
  registerControl: (type: string, control: InspectorControl) => void;
  registerCategory: (slug: string, title: string) => void;
  registerBlockEditor: (blockType: string, editor: BlockEditor) => void;
  registerTransform: (from: string, transform: BlockTransform) => void;
  registerToolbarAction: (action: ToolbarAction) => void;
  registerInspectorPanel: (panel: InspectorPanelExtension) => void;
  registerPattern: (pattern: Pattern) => void;
};

export function getControl(type: string): InspectorControl | undefined { return controls.get(type); }
export function getCategoryTitle(slug: string): string | undefined { return categories.get(slug); }
export function getBlockEditor(type: string): BlockEditor | undefined { return blockEditors.get(type); }
export function getTransforms(type: string): BlockTransform[] { return transforms.get(type) ?? []; }
export function getToolbarActions(block?: PageBlock | null): ToolbarAction[] { return [...toolbarActions.values()].filter(action => !block || !action.when || action.when(block)); }
export function getInspectorPanels(): InspectorPanelExtension[] { return [...inspectorPanels.values()]; }
export function getRegisteredPatterns(): Pattern[] { return [...patterns.values()]; }

export function initializeExtensionApi(): PageBuilderApi {
  const api: PageBuilderApi = {
    registerControl: (type, control) => controls.set(type, control),
    registerCategory: (slug, title) => categories.set(slug, title),
    registerBlockEditor: (blockType, editor) => blockEditors.set(blockType, editor),
    registerTransform: (from, transform) => transforms.set(from, [...(transforms.get(from) ?? []), transform]),
    registerToolbarAction: action => toolbarActions.set(action.id, action),
    registerInspectorPanel: panel => inspectorPanels.set(panel.id, panel),
    registerPattern: pattern => patterns.set(pattern.id, pattern),
  };

  window.PageBuilder = api;
  window.dispatchEvent(new CustomEvent('page-builder:ready', { detail: api }));
  return api;
}
