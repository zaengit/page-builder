import type { ComponentType } from 'react';

export type AttrSchema = {
  type:string;
  label?:string;
  default?:unknown;
  options?:Array<string|number>;
  fields?:Record<string,AttrSchema>;
  min?:number;
  max?:number;
  step?:number;
  help?:string;
};

export type BlockVariation = {
  name:string;
  title:string;
  description?:string;
  attrs?:Record<string,unknown>;
};

export type BlockDefinition = {
  name:string;
  title:string;
  category:string;
  icon?:string;
  description?:string;
  attributes:Record<string,AttrSchema>;
  variations?:BlockVariation[];
  supports?:{
    children?:boolean;
    allowedChildren?:string[];
  };
};

export type PageBlock = {
  id:string;
  type:string;
  attrs:Record<string,unknown>;
  children?:PageBlock[];
};

export type PageContent = {blocks:PageBlock[]};

export type EditorRuntime = {
  blocksUrl:string;
  renderBlockUrl:string;
  renderPageUrl:string;
  previewUrl:string;
  mediaPicker?:boolean;
};

export type ControlProps = {
  name:string;
  schema:AttrSchema;
  value:unknown;
  onChange:(value:unknown)=>void;
  requestMedia?:()=>void;
};

export type InspectorControl = ComponentType<ControlProps>;
