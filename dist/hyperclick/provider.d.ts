import type { Resolution } from "./resolve";
import type { Notifier } from "../host/types";
export interface NavigationHost {
    openFile(path: string): void;
    openFileAt(path: string, line: number, column: number): void;
    moveCursor(line: number, column: number): void;
    showApiReference(path: string): void;
    notifier: Notifier;
}
export declare function performResolution(resolution: Resolution, host: NavigationHost): void;
