// Minimal ambient declaration for the `diff` package.
//
// `diff@7.0.0` ships JS only — no .d.ts files — and the official
// `@types/diff@8` is a deprecated stub that points back at the package.
// This declaration covers the small surface we actually use
// (`diff.diffLines` and the `Change` shape) without pulling in another
// dependency.

declare module "diff" {
  export interface Change {
    value: string;
    count?: number;
    added?: boolean;
    removed?: boolean;
  }

  export function diffLines(
    oldStr: string,
    newStr: string,
    options?: Record<string, unknown>,
  ): Change[];

  export function diffWords(
    oldStr: string,
    newStr: string,
    options?: Record<string, unknown>,
  ): Change[];

  export function diffChars(
    oldStr: string,
    newStr: string,
    options?: Record<string, unknown>,
  ): Change[];
}
