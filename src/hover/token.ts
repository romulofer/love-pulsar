// Locates the love.* symbol under a cursor column within a single line. Pure
// and host-agnostic so the datatip adapter in main.ts can turn the result into
// an editor Range without any editor API. Returns the dotted path plus its
// column span, or null when the token under the column is not a love.* symbol.

export interface SymbolSpan {
  path: string; // dotted love.* path, e.g. "love.window.setTitle"
  start: number; // 0-based inclusive start column
  end: number; // 0-based exclusive end column
}

const IDENT = /[A-Za-z0-9_.]/;

export function loveSymbolAt(lineText: string, column: number): SymbolSpan | null {
  let start = column;
  let end = column;
  while (start > 0 && IDENT.test(lineText[start - 1] as string)) start--;
  while (end < lineText.length && IDENT.test(lineText[end] as string)) end++;
  const path = lineText.slice(start, end);
  if (!path.startsWith("love")) return null;
  return { path, start, end };
}
