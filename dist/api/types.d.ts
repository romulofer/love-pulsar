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
    path: string;
    name: string;
    kind: ApiKind;
    signature?: string;
    params?: ApiParam[];
    returns?: ApiReturn[];
    description?: string;
    url?: string;
}
