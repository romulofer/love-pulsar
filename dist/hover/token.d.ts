export interface SymbolSpan {
    path: string;
    start: number;
    end: number;
}
export declare function loveSymbolAt(lineText: string, column: number): SymbolSpan | null;
