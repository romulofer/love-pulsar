// Host-agnostic adapter interfaces. Pure logic depends on these, never on the
// Pulsar/Atom API directly, so every module is unit-testable without the editor.

export interface Disposable {
  dispose(): void;
}

// Minimal composite that owns a set of disposables. Mirrors the shape of
// atom.CompositeDisposable but carries no editor dependency.
export class CompositeDisposable implements Disposable {
  private readonly items = new Set<Disposable>();
  private disposed = false;

  add(...disposables: Disposable[]): void {
    if (this.disposed) {
      for (const d of disposables) d.dispose();
      return;
    }
    for (const d of disposables) this.items.add(d);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const d of this.items) d.dispose();
    this.items.clear();
  }

  get size(): number {
    return this.items.size;
  }
}

// Notification surface. Errors are surfaced to the user through this, never
// thrown across the host boundary.
export interface Notifier {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
