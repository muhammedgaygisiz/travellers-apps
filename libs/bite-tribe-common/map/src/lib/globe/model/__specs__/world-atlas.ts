import { readFileSync } from 'node:fs';
import type { GlobeDetail, GlobeOutlineLoader } from '../globe-outlines';

const FILE: Record<GlobeDetail, string> = {
  coarse: 'world-atlas/countries-110m.json',
  fine: 'world-atlas/countries-50m.json',
};

/** The real `world-atlas` topology, read from `node_modules` for specs. */
export const readWorldAtlas = (
  detail: GlobeDetail,
): Awaited<ReturnType<GlobeOutlineLoader>> =>
  JSON.parse(readFileSync(require.resolve(FILE[detail]), 'utf8'));
