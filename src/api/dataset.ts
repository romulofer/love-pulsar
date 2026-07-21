// Loads and queries the bundled LOVE API dataset. Fully offline: the JSON ships
// in the package and is read from disk, never fetched.

import { readFileSync } from "fs";
import { join } from "path";
import type { ApiEntry } from "./types";

// data/love-api.json sits two levels above this module both in source
// (src/api/dataset.ts) and in the compiled output (dist/api/dataset.js), so the
// same relative path resolves correctly in tests and at runtime.
const DATASET_PATH = join(__dirname, "..", "..", "data", "love-api.json");

export class Dataset {
  private readonly entries: ApiEntry[];
  private readonly byPath: Map<string, ApiEntry>;

  constructor(entries: ApiEntry[]) {
    this.entries = entries;
    this.byPath = new Map(entries.map((e) => [e.path, e]));
  }

  // Loads the bundled dataset from disk.
  static load(): Dataset {
    return Dataset.fromJson(readFileSync(DATASET_PATH, "utf8"));
  }

  // Parses a dataset from a JSON string. Kept separate from load() so callers
  // can construct datasets from fixtures without touching the filesystem.
  static fromJson(text: string): Dataset {
    const parsed = JSON.parse(text) as ApiEntry[];
    return new Dataset(parsed);
  }

  all(): ApiEntry[] {
    return this.entries;
  }

  // Exact lookup by fully-qualified path.
  lookup(path: string): ApiEntry | undefined {
    return this.byPath.get(path);
  }

  // Prefix search over paths, e.g. query("love.gr") matches "love.graphics".
  // Results are sorted by path for stable ordering.
  query(prefix: string): ApiEntry[] {
    if (prefix.length === 0) return [...this.entries].sort(byPath);
    return this.entries.filter((e) => e.path.startsWith(prefix)).sort(byPath);
  }

  // Direct children of a path: entries one dotted segment deeper, excluding the
  // parent itself and any deeper descendants.
  membersOf(path: string): ApiEntry[] {
    const prefix = path + ".";
    return this.entries
      .filter((e) => {
        if (!e.path.startsWith(prefix)) return false;
        const rest = e.path.slice(prefix.length);
        return rest.length > 0 && !rest.includes(".");
      })
      .sort(byPath);
  }
}

function byPath(a: ApiEntry, b: ApiEntry): number {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}
