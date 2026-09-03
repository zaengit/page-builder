export type RenderRequest = {
  page: Record<string, unknown>;
  registry: Record<string, Record<string, unknown>>;
  context: Record<string, unknown>;
};

export type RenderResult = {
  html: string;
  assets: { css: string[]; js: string[] };
  diagnostics: string[];
};

export interface DataProvider {
  resolve(request: Record<string, unknown>, context: Record<string, unknown>): Promise<unknown> | unknown;
}

export interface Renderer {
  render(request: RenderRequest): Promise<RenderResult> | RenderResult;
}
