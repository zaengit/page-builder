import type { ComponentType, ReactNode } from 'react';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export type ResponsiveValue<T = unknown> = { desktop?: T; tablet?: T; mobile?: T };
export type VisibilityRule = { attribute: string; equals?: unknown; notEquals?: unknown; truthy?: boolean };

export type AttrSchema = {
  type: string;
  control?: string;
  label?: string;
  default?: unknown;
  options?: Array<string | number>;
  fields?: Record<string, AttrSchema>;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  responsive?: boolean;
  visibleWhen?: VisibilityRule | VisibilityRule[];
  group?: string;
};

export type BlockVariation = { name: string; title: string; description?: string; attrs?: Record<string, unknown> };
export type BlockSlot = { name: string; title?: string; allowedChildren?: string[] };
export type BlockTransform = { name: string; title: string; to: string; mapAttrs?: (attrs: Record<string, unknown>) => Record<string, unknown> };
export type BlockLock = { move?: boolean; remove?: boolean; edit?: boolean };
export type DynamicBinding = { source: string; path?: string; fallback?: unknown };

export type BlockStyle = {
  className?: string;
  background?: string | ResponsiveValue<string>;
  color?: string | ResponsiveValue<string>;
  padding?: string | ResponsiveValue<string>;
  margin?: string | ResponsiveValue<string>;
  gap?: string | ResponsiveValue<string>;
  width?: string | ResponsiveValue<string>;
  textAlign?: string | ResponsiveValue<string>;
  fontSize?: string | ResponsiveValue<string>;
  borderRadius?: string | ResponsiveValue<string>;
  boxShadow?: string | ResponsiveValue<string>;
  hidden?: ResponsiveValue<boolean>;
  custom?: Record<string, string | number | ResponsiveValue<string | number>>;
};

export type ColorSchemeColors = {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
};

export type ColorScheme = {
  id: string;
  name: string;
  colors: ColorSchemeColors;
};

export type BlockDefinition = {
  name: string;
  title: string;
  category: string;
  version: number;
  icon?: string;
  description?: string;
  attributes: Record<string, AttrSchema>;
  variations?: BlockVariation[];
  supports?: {
    children?: boolean;
    allowedChildren?: string[];
    slots?: BlockSlot[];
    reusable?: boolean;
    lock?: boolean;
    styles?: boolean;
    inline?: string[];
  };
};

export type PageBlock = {
  id: string;
  type: string;
  version?: number;
  attrs: Record<string, unknown>;
  children?: PageBlock[];
  slot?: string;
  colorSchemeId?: string;
  styles?: BlockStyle;
  bindings?: Record<string, DynamicBinding>;
  lock?: BlockLock;
};

export type PageSettings = {
  contentWidth?: string;
  background?: string;
  customClass?: string;
  customCss?: string;
  tokens?: Record<string, string>;
  typography?: { fontFamily?: string; fontSize?: string; lineHeight?: string; color?: string };
  colorSchemes?: ColorScheme[];
  defaultColorSchemeId?: string;
};

export type PageContent = { blocks: PageBlock[]; settings?: PageSettings; schemaVersion?: number };
export type Pattern = { id: string; title: string; category?: string; blocks: PageBlock[] };
export type PageTemplate = { id: string; title: string; description?: string; content: PageContent };
export type DataSource = { name: string; title: string; paths?: string[] };

export type EditorRuntime = {
  blocksUrl: string;
  renderBlockUrl: string;
  renderPageUrl: string;
  previewUrl: string;
  mediaPicker?: boolean;
  patterns?: Pattern[];
  templates?: PageTemplate[];
  dataSources?: DataSource[];
  autosaveMs?: number;
};

export type ControlProps = {
  name: string;
  path?: string[];
  schema: AttrSchema;
  value: unknown;
  attrs?: Record<string, unknown>;
  breakpoint?: Breakpoint;
  onChange: (value: unknown) => void;
  requestMedia?: (path: string[]) => void;
};

export type InspectorControl = ComponentType<ControlProps>;
export type BlockEditorProps = { block: PageBlock; definition: BlockDefinition; children?: ReactNode; updateAttrs: (attrs: Record<string, unknown>) => void };
export type BlockEditor = ComponentType<BlockEditorProps>;
export type ToolbarAction = { id: string; title: string; when?: (block: PageBlock) => boolean; run: (block: PageBlock) => void };
export type InspectorPanelExtension = { id: string; title: string; render: ComponentType<{ block: PageBlock; definition: BlockDefinition }> };
