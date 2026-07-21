import { type Disposable } from "./host/types";
export declare const config: {
    loveBinaryPath: {
        type: string;
        default: string;
        title: string;
        description: string;
        order: number;
    };
    sourceDirs: {
        type: string;
        default: string[];
        items: {
            type: string;
        };
        title: string;
        description: string;
        order: number;
    };
};
type AtomLike = any;
export declare function activate(): void;
export declare function deactivate(): void;
export declare function provideAutocomplete(): unknown;
export declare function provideHyperclick(): unknown;
export declare function consumeDatatipService(service: AtomLike): Disposable;
export declare function provideLinter(): unknown;
export declare function consumeStatusBar(statusBar: AtomLike): void;
export {};
