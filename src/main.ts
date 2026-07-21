// Package entry point. Pulsar calls activate() on load and deactivate() on
// unload. This module stays thin: it wires providers into the host and owns
// their lifetime via a CompositeDisposable. All real logic lives in the pure
// modules under src/.

import { CompositeDisposable } from "./host/types";
import { configSchema } from "./config";

// Pulsar reads this exported schema to render the package settings UI.
export const config = configSchema;

let subscriptions: CompositeDisposable | null = null;

export function activate(): void {
  subscriptions = new CompositeDisposable();
  // Providers are registered here in later tasks (autocomplete, hyperclick,
  // hover, run). Each registration returns a Disposable added to `subscriptions`.
}

export function deactivate(): void {
  subscriptions?.dispose();
  subscriptions = null;
}
