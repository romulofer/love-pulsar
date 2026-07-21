import type { Dataset } from "../api/dataset";
import type { ApiKind, ApiParam, ApiReturn } from "../api/types";
export interface HoverDoc {
    path: string;
    kind: ApiKind;
    signature: string;
    params: ApiParam[];
    returns: ApiReturn[];
    description: string;
    url?: string;
}
export declare function buildHover(dataset: Dataset, path: string): HoverDoc | null;
export declare function renderHoverMarkdown(doc: HoverDoc): string;
