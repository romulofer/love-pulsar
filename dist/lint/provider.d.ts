import type { Dataset } from "../api/dataset";
export type Severity = "error" | "warning" | "info";
export interface Diagnostic {
    line: number;
    column: number;
    endColumn: number;
    severity: Severity;
    message: string;
}
export declare function lintSource(dataset: Dataset, source: string): Diagnostic[];
