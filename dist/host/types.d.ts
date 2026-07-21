export interface Disposable {
    dispose(): void;
}
export declare class CompositeDisposable implements Disposable {
    private readonly items;
    private disposed;
    add(...disposables: Disposable[]): void;
    dispose(): void;
    get size(): number;
}
export interface Notifier {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
