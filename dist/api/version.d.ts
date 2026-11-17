export interface LoveVersion {
    major: number;
    minor: number;
}
export declare function parseLoveVersion(text: string): LoveVersion | null;
export declare function versionMismatchMessage(installedOutput: string, datasetVersion: string): string | null;
