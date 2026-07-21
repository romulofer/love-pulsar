// Package settings. configSchema is the Pulsar-facing schema (rendered in the
// settings UI). resolveConfig turns the raw values Pulsar provides into a
// typed, defaulted config, and sourceRoots expands source dirs against a
// project root for the require resolver. Kept pure so it is testable without
// the editor.

import { join } from "path";
import { defaultLoveBinary } from "./run/runner";

export interface LovePulsarConfig {
  loveBinaryPath: string;
  sourceDirs: string[];
}

// Raw shape as read from Pulsar's config store; every field is optional.
export interface RawConfig {
  loveBinaryPath?: string;
  sourceDirs?: string[];
}

export const configSchema = {
  loveBinaryPath: {
    type: "string",
    default: "",
    title: "LOVE binary path",
    description:
      "Path to the love executable. Leave empty to use the platform default (love on PATH).",
    order: 1,
  },
  sourceDirs: {
    type: "array",
    default: ["."],
    items: { type: "string" },
    title: "Source directories",
    description:
      "Directories, relative to the project root, searched when resolving require() paths.",
    order: 2,
  },
};

export function resolveConfig(raw: RawConfig, platform: NodeJS.Platform): LovePulsarConfig {
  const trimmed = raw.loveBinaryPath?.trim();
  const loveBinaryPath = trimmed && trimmed.length > 0 ? trimmed : defaultLoveBinary(platform);
  const sourceDirs = raw.sourceDirs && raw.sourceDirs.length > 0 ? raw.sourceDirs : ["."];
  return { loveBinaryPath, sourceDirs };
}

// Absolute search roots for require resolution.
export function sourceRoots(config: LovePulsarConfig, projectRoot: string): string[] {
  return config.sourceDirs.map((dir) => join(projectRoot, dir));
}
