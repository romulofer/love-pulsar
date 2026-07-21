// Parses LOVE process output for clickable error locations. Pure: the console
// adapter feeds captured stdout/stderr through parseErrorLocations and renders
// each result as a clickable entry that opens the file at the line.

export interface ErrorLocation {
  file: string;
  line: number;
  raw: string; // the matched "file:line" text
}

// Matches "somefile.lua:123" anywhere in the output, including stack traces.
const FILE_LINE = /([\w./\\-]+\.lua):(\d+)/g;

export function parseErrorLocations(output: string): ErrorLocation[] {
  const locations: ErrorLocation[] = [];
  for (const match of output.matchAll(FILE_LINE)) {
    locations.push({
      file: match[1] as string,
      line: Number(match[2]),
      raw: match[0],
    });
  }
  return locations;
}
