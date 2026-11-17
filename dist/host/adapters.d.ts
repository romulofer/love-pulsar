import type { Dataset } from "../api/dataset";
export interface AutocompleteItem {
    text: string;
    type: string;
    displayText: string;
    rightLabel: string;
    description: string;
}
export interface ProjectContext {
    source: string;
    roots: string[];
    cursorLine?: number;
    projectRoot?: string;
}
export declare function suggestionsForLine(dataset: Dataset, lineBeforeCursor: string, project?: ProjectContext): AutocompleteItem[];
export declare function hoverMarkdownForSymbol(dataset: Dataset, path: string): string | null;
