// Shared types for the bundled LOVE API dataset. These describe the shape of
// every entry in data/love-api.json and are consumed by autocomplete, hover,
// and hyperclick.

export type ApiKind = "module" | "function" | "callback" | "enum" | "constant";

export interface ApiParam {
  name: string;
  type?: string;
  description?: string;
}

export interface ApiReturn {
  name?: string;
  type?: string;
  description?: string;
}

export interface ApiEntry {
  // Fully-qualified dotted path, e.g. "love.graphics.draw".
  path: string;
  // Final segment of the path, e.g. "draw".
  name: string;
  kind: ApiKind;
  // Human-readable call signature, e.g. "love.graphics.draw(drawable, x, y)".
  signature?: string;
  params?: ApiParam[];
  returns?: ApiReturn[];
  description?: string;
  // Optional deep-link to the online reference (used by hover for API symbols).
  url?: string;
}
