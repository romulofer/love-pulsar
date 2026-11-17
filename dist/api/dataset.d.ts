import type { ApiEntry, Deprecation } from "./types";
export declare const UNKNOWN_VERSION = "unknown";
export declare class Dataset {
    private readonly entries;
    private readonly byPath;
    private readonly deprecations;
    readonly loveVersion: string;
    constructor(entries: ApiEntry[], loveVersion?: string, deprecations?: Record<string, Deprecation>);
    static load(): Dataset;
    static fromJson(text: string, deprecations?: Record<string, Deprecation>): Dataset;
    all(): ApiEntry[];
    lookup(path: string): ApiEntry | undefined;
    deprecation(path: string): Deprecation | undefined;
    query(prefix: string): ApiEntry[];
    membersOf(path: string): ApiEntry[];
}
