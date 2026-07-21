export interface ErrorLocation {
    file: string;
    line: number;
    raw: string;
}
export declare function parseErrorLocations(output: string): ErrorLocation[];
