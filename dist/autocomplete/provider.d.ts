import type { Dataset } from "../api/dataset";
import type { ApiKind } from "../api/types";
export interface Suggestion {
    text: string;
    path: string;
    type: ApiKind;
    signature: string;
    description: string;
}
export declare function extractDottedPrefix(line: string): string;
export declare function buildSuggestions(dataset: Dataset, prefix: string): Suggestion[];
