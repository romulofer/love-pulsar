import type { Notifier } from "../host/types";
export interface ChildProcessLike {
    on(event: "error" | "exit", listener: (arg: unknown) => void): void;
    kill(): void;
}
export type SpawnFn = (command: string, args: string[]) => ChildProcessLike;
export declare function findProjectRoot(startDir: string): string | null;
export declare function defaultLoveBinary(platform: NodeJS.Platform): string;
export declare function buildRunCommand(binary: string, projectRoot: string): {
    command: string;
    args: string[];
};
export declare class LoveRunner {
    private readonly spawnFn;
    private readonly notifier;
    private child;
    constructor(spawnFn: SpawnFn, notifier: Notifier);
    run(binary: string, projectRoot: string): void;
    stop(): void;
    get running(): boolean;
}
