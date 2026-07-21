// Mapping helpers that bridge the pure cores to the shapes Pulsar's services
// expect. These stay pure (input strings in, plain objects out) so they are
// testable without the editor; main.ts calls them from within the live
// autocomplete-plus and datatip providers.

import type { Dataset } from "../api/dataset";
import { buildSuggestions, extractDottedPrefix } from "../autocomplete/provider";
import { buildHover, renderHoverMarkdown } from "../hover/provider";

// autocomplete-plus suggestion shape (the fields we populate).
export interface AutocompleteItem {
  text: string;
  type: string;
  displayText: string;
  rightLabel: string;
  description: string;
}

export function suggestionsForLine(dataset: Dataset, lineBeforeCursor: string): AutocompleteItem[] {
  const prefix = extractDottedPrefix(lineBeforeCursor);
  if (prefix.length === 0) return [];
  return buildSuggestions(dataset, prefix).map((s) => ({
    text: s.text,
    type: s.type,
    displayText: s.text,
    rightLabel: s.type,
    description: s.description || s.signature,
  }));
}

// Rendered hover markdown for a symbol path, or null if unknown.
export function hoverMarkdownForSymbol(dataset: Dataset, path: string): string | null {
  const doc = buildHover(dataset, path);
  return doc ? renderHoverMarkdown(doc) : null;
}
