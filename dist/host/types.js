"use strict";
// Host-agnostic adapter interfaces. Pure logic depends on these, never on the
// Pulsar/Atom API directly, so every module is unit-testable without the editor.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeDisposable = void 0;
// Minimal composite that owns a set of disposables. Mirrors the shape of
// atom.CompositeDisposable but carries no editor dependency.
class CompositeDisposable {
    constructor() {
        this.items = new Set();
        this.disposed = false;
    }
    add(...disposables) {
        if (this.disposed) {
            for (const d of disposables)
                d.dispose();
            return;
        }
        for (const d of disposables)
            this.items.add(d);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const d of this.items)
            d.dispose();
        this.items.clear();
    }
    get size() {
        return this.items.size;
    }
}
exports.CompositeDisposable = CompositeDisposable;
//# sourceMappingURL=types.js.map