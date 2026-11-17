export type ProjectSymbolType = "function" | "method" | "variable";
export interface ProjectSymbol {
    name: string;
    type: ProjectSymbolType;
    signature: string;
    line: number;
}
export interface ProjectSuggestion extends ProjectSymbol {
    origin: string;
}
export declare function extractMemberPrefix(line: string): string;
export declare function scanSymbols(source: string, skipLine?: number): ProjectSymbol[];
export declare function scanMembers(source: string, table: string, skipLine?: number): ProjectSymbol[];
export declare function moduleTable(source: string): string | null;
export declare function projectSuggestions(input: {
    source: string;
    lineBeforeCursor: string;
    roots: string[];
    cursorLine?: number;
    projectRoot?: string;
}): ProjectSuggestion[];
