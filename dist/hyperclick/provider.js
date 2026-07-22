"use strict";
// Host wiring for go-to-definition. Thin: it turns a Resolution into a concrete
// editor action through an injected NavigationHost, and surfaces a notification
// (never a throw) when nothing resolves. The NavigationHost is implemented by
// the Pulsar adapter in main.ts; tests supply a fake.
Object.defineProperty(exports, "__esModule", { value: true });
exports.performResolution = performResolution;
function performResolution(resolution, host) {
    switch (resolution.kind) {
        case "file":
            host.openFile(resolution.path);
            return;
        case "definition":
            if (resolution.path) {
                host.openFileAt(resolution.path, resolution.line, resolution.column);
            }
            else {
                host.moveCursor(resolution.line, resolution.column);
            }
            return;
        case "api":
            host.showApiReference(resolution.path);
            return;
        case "missing":
            host.notifier.warn("love-pulsar: could not resolve the target under the cursor.");
            return;
    }
}
//# sourceMappingURL=provider.js.map