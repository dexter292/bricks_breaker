/**
 * Pack validated LevelFileV1 into typed CompiledLevel arrays (JS thread).
 * No World writes; no 'worklet' directive (D-01…D-04).
 */

import { BrickFlags } from '../types';
import type { CompiledLevel, LevelFileV1 } from './schema';

export function compileLevel(level: LevelFileV1): CompiledLevel {
  const { cols, rows, originX, originY, brickW, brickH, gapX, gapY } = level.grid;

  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  const hs: number[] = [];
  const hps: number[] = [];
  const flagsArr: number[] = [];

  for (let r = 0; r < rows; r++) {
    const row = level.cells[r];
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (ch === '.') {
        continue;
      }
      const def = level.brickTypes[ch];
      xs.push(originX + c * (brickW + gapX));
      ys.push(originY + r * (brickH + gapY));
      ws.push(brickW);
      hs.push(brickH);
      hps.push(def.hp);
      let flags = 0;
      if (def.unbreakable) {
        flags |= BrickFlags.UNBREAKABLE;
      }
      if (def.explosive) {
        flags |= BrickFlags.EXPLOSIVE;
      }
      flagsArr.push(flags);
    }
  }

  const brickCount = xs.length;
  return {
    brickCount,
    x: new Float32Array(xs),
    y: new Float32Array(ys),
    w: new Float32Array(ws),
    h: new Float32Array(hs),
    hp: Int16Array.from(hps),
    flags: Uint8Array.from(flagsArr),
    gridCols: cols,
    gridRows: rows,
    originX,
    originY,
    pitchX: brickW + gapX,
    pitchY: brickH + gapY,
  };
}
