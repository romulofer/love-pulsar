export interface LovePulsarConfig {
    loveBinaryPath: string;
    sourceDirs: string[];
}
export interface RawConfig {
    loveBinaryPath?: string;
    sourceDirs?: string[];
}
export declare const configSchema: {
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
export declare function resolveConfig(raw: RawConfig, platform: NodeJS.Platform): LovePulsarConfig;
export declare function sourceRoots(config: LovePulsarConfig, projectRoot: string): string[];
