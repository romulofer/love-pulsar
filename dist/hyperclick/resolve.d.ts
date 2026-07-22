export interface Definition {
    line: number;
    column: number;
}
export type Resolution = {
    kind: "file";
    path: string;
} | {
    kind: "definition";
    path?: string;
    line: number;
    column: number;
} | {
    kind: "api";
    path: string;
} | {
    kind: "missing";
};
export declare function findRequireTarget(lineText: string): string | null;
export declare function resolveRequire(moduleName: string, roots: string[]): string | null;
export declare function resolveLocalDefinition(source: string, name: string): Definition | null;
export declare function resolveClick(input: {
    lineText: string;
    word: string;
    dottedPath?: string;
    source: string;
    roots: string[];
    isApiPath: (path: string) => boolean;
}): Resolution;
