/**
 * Level authoring schema (LVL-01 / D-01…D-03).
 * Plain TypeScript types — no Zod.
 *
 * Char keys in `brickTypes` / `cells` are discretionary (documented defaults:
 * `"1" | "2" | "3" | "X"`). Empty cell is always `"."`.
 */

export const SCHEMA_VERSION = 1 as const;

export type BrickTypeDef = {
  hp: number;
  unbreakable?: boolean;
};

export type LevelFileV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  grid: {
    cols: number;
    rows: number;
    originX: number;
    originY: number;
    brickW: number;
    brickH: number;
    gapX: number;
    gapY: number;
  };
  brickTypes: Record<string, BrickTypeDef>;
  cells: string[];
};

export type CompiledLevel = {
  brickCount: number;
  x: Float32Array;
  y: Float32Array;
  w: Float32Array;
  h: Float32Array;
  hp: Int16Array;
  flags: Uint8Array;
  gridCols: number;
  gridRows: number;
  /** Lattice origin / pitch for broadphase (brickW+gapX, brickH+gapY). */
  originX: number;
  originY: number;
  pitchX: number;
  pitchY: number;
};

export type ValidationIssue = { path: string; message: string };
