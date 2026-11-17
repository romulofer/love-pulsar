// Mapping helpers that bridge the pure cores to the shapes Pulsar's services
// expect. These stay pure (input strings in, plain objects out) so they are
// testable without the editor; main.ts calls them from within the live
// autocomplete-plus and datatip providers.

import type { Dataset } from "../api/dataset";
import { buildSuggestions, extractDottedPrefix } from "../autocomplete/provider";
import { projectSuggestions } from "../autocomplete/project";
import { buildHover, renderHoverMarkdown } from "../hover/provider";

// autocomplete-plus suggestion shape (the fields we populate).
export interface AutocompleteItem {
  text: string;
  type: string;
  displayText: string;
  rightLabel: string;
  description: string;
}

// What the project-symbol autocomplete needs to know about the editor. Omit it
// to get LOVE API suggestions only.
export interface ProjectContext {
  source: string;
  roots: string[];
  // 1-based line the cursor is on.
  cursorLine?: number;
  projectRoot?: string;
}

export function suggestionsForLine(
  dataset: Dataset,
  lineBeforeCursor: string,
  project?: ProjectContext,
): AutocompleteItem[] {
  const prefix = extractDottedPrefix(lineBeforeCursor);
  const api: AutocompleteItem[] =
    prefix.length === 0
      ? []
      : buildSuggestions(dataset, prefix).map((s) => ({
          text: s.text,
          type: s.type,
          displayText: s.text,
          rightLabel: s.type,
          description: s.description || s.signature,
        }));
  if (!project) return api;

  const own: AutocompleteItem[] = projectSuggestions({ ...project, lineBeforeCursor }).map((s) => ({
    text: s.name,
    type: s.type,
    displayText: s.name,
    rightLabel: s.origin,
    description: s.signature,
  }));
  return [...api, ...own];
}

// Rendered hover markdown for a symbol path, or null if unknown.
export function hoverMarkdownForSymbol(dataset: Dataset, path: string): string | null {
  const doc = buildHover(dataset, path);
  return doc ? renderHoverMarkdown(doc) : null;
}
