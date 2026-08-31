export type AttrSchema = {
  type:string;
  label?:string;
  default?:unknown;
  options?:Array<string|number>;
  fields?:Record<string,AttrSchema>;
  min?:number;
  max?:number;
  step?:number;
};
export type BlockDefinition = {name:string;title:string;category:string;attributes:Record<string,AttrSchema>;supports?:{children?:boolean}};
export type PageBlock = {id:string;type:string;attrs:Record<string,unknown>;children?:PageBlock[]};
export type PageContent = {blocks:PageBlock[]};
export type Page = {id:number;title:string;slug:string;status:'draft'|'published';draft_content:PageContent;published_content?:PageContent|null};
