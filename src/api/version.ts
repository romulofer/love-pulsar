// LOVE version helpers. Pure: parse the output of `love --version` and compare
// it with the version the bundled API dataset describes.

export interface LoveVersion {
  major: number;
  minor: number;
}

// Parses "LOVE 11.5 (Mysterious Mysteries)" or a bare "11.5" / "11.5.1".
export function parseLoveVersion(text: string): LoveVersion | null {
  const match = /(\d+)\.(\d+)/.exec(text);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

// Returns a warning when the installed LOVE and the dataset differ in
// major.minor (patch releases do not change the API), otherwise null. Unknown
// or unparsable versions on either side produce no warning.
export function versionMismatchMessage(installedOutput: string, datasetVersion: string): string | null {
  const installed = parseLoveVersion(installedOutput);
  const described = parseLoveVersion(datasetVersion);
  if (!installed || !described) return null;
  if (installed.major === described.major && installed.minor === described.minor) return null;
  return (
    `love-pulsar: installed LOVE is ${installed.major}.${installed.minor} but the bundled API ` +
    `data describes ${described.major}.${described.minor}. Autocomplete, hover and lint ` +
    `warnings may be inaccurate.`
  );
}
