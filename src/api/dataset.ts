// Loads and queries the bundled LOVE API dataset. Fully offline: the JSON ships
// in the package and is read from disk, never fetched.

import { readFileSync } from "fs";
import { join } from "path";
import type { ApiEntry, Deprecation } from "./types";

// data/ sits two levels above this module both in source (src/api/dataset.ts)
// and in the compiled output (dist/api/dataset.js), so the same relative path
// resolves correctly in tests and at runtime.
const DATA_DIR = join(__dirname, "..", "..", "data");
const DATASET_PATH = join(DATA_DIR, "love-api.json");
const DEPRECATED_PATH = join(DATA_DIR, "deprecated.json");

// Version reported by datasets that predate the version field (a bare array).
export const UNKNOWN_VERSION = "unknown";

interface DatasetFile {
  loveVersion?: string;
  entries: ApiEntry[];
}

export class Dataset {
  private readonly entries: ApiEntry[];
  private readonly byPath: Map<string, ApiEntry>;
  private readonly deprecations: Map<string, Deprecation>;
  // LOVE version the dataset describes, e.g. "11.5".
  readonly loveVersion: string;

  constructor(
    entries: ApiEntry[],
    loveVersion: string = UNKNOWN_VERSION,
    deprecations: Record<string, Deprecation> = {},
  ) {
    this.entries = entries;
    this.byPath = new Map(entries.map((e) => [e.path, e]));
    this.loveVersion = loveVersion;
    this.deprecations = new Map(Object.entries(deprecations));
  }

  // Loads the bundled dataset and deprecation list from disk.
  static load(): Dataset {
    const deprecations = JSON.parse(readFileSync(DEPRECATED_PATH, "utf8")) as Record<
      string,
      Deprecation
    >;
    return Dataset.fromJson(readFileSync(DATASET_PATH, "utf8"), deprecations);
  }

  // Parses a dataset from a JSON string. Kept separate from load() so callers
  // can construct datasets from fixtures without touching the filesystem.
  // Accepts the current `{ loveVersion, entries }` shape and the older bare
  // array of entries.
  static fromJson(text: string, deprecations: Record<string, Deprecation> = {}): Dataset {
    const parsed = JSON.parse(text) as ApiEntry[] | DatasetFile;
    if (Array.isArray(parsed)) return new Dataset(parsed, UNKNOWN_VERSION, deprecations);
    return new Dataset(parsed.entries, parsed.loveVersion ?? UNKNOWN_VERSION, deprecations);
  }

  all(): ApiEntry[] {
    return this.entries;
  }

  // Exact lookup by fully-qualified path.
  lookup(path: string): ApiEntry | undefined {
    return this.byPath.get(path);
  }

  // Deprecation info for a symbol that is deprecated but still works, if any.
  deprecation(path: string): Deprecation | undefined {
    return this.deprecations.get(path);
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
