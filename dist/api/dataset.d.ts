import type { ApiEntry } from "./types";
export declare class Dataset {
    private readonly entries;
    private readonly byPath;
    constructor(entries: ApiEntry[]);
    static load(): Dataset;
    static fromJson(text: string): Dataset;
    all(): ApiEntry[];
    lookup(path: string): ApiEntry | undefined;
    query(prefix: string): ApiEntry[];
    membersOf(path: string): ApiEntry[];
}
