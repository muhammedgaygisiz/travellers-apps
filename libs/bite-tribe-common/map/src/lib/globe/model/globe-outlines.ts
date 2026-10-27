import { InjectionToken } from '@angular/core';
import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature } from 'topojson-client';
import { countryCodeOfOutline } from './countries';

/**
 * How finely the country outlines are drawn. `coarse` (1:110m, ~100 KB) is
 * enough for the whole globe; `fine` (1:50m, ~750 KB) holds up when zoomed in
 * and is the only set that draws the smallest countries (Singapore, Malta).
 */
export type GlobeDetail = 'coarse' | 'fine';

/** One country outline, keyed by the alpha-2 code profiles store. */
export interface CountryOutline {
  /** `undefined` for an outline that is no ISO country, such as Somaliland. */
  countryCode: string | undefined;
  feature: Feature<Geometry>;
}

type CountriesTopology = Topology<{ countries: GeometryCollection }>;

/** Loads the `world-atlas` country topology at the given detail. */
export type GlobeOutlineLoader = (
  detail: GlobeDetail,
) => Promise<CountriesTopology>;

const OUTLINE_FILE: Record<GlobeDetail, string> = {
  coarse: 'countries-110m.json',
  fine: 'countries-50m.json',
};

/**
 * Where the outlines are served from. The app build copies them out of
 * `node_modules/world-atlas` into its assets, so they ship with the app and
 * the globe draws offline.
 */
export const GLOBE_OUTLINE_PATH = 'assets/world-atlas';

const fetchOutlines: GlobeOutlineLoader = async (detail) => {
  const response = await fetch(`${GLOBE_OUTLINE_PATH}/${OUTLINE_FILE[detail]}`);

  if (!response.ok) {
    throw new Error(`Globe outlines not loaded: ${response.status}`);
  }

  return response.json();
};

/**
 * The outline source. A token so stories and specs can hand the globe a
 * topology without a network.
 */
export const GLOBE_OUTLINE_LOADER = new InjectionToken<GlobeOutlineLoader>(
  'GLOBE_OUTLINE_LOADER',
  { providedIn: 'root', factory: (): GlobeOutlineLoader => fetchOutlines },
);

/** The topology's countries as GeoJSON features, each with its alpha-2 code. */
export const toCountryOutlines = (
  topology: CountriesTopology,
): CountryOutline[] =>
  feature(topology, topology.objects.countries).features.map((outline) => ({
    countryCode: countryCodeOfOutline(
      outline.id,
      (outline.properties as { name?: string } | null)?.name,
    ),
    feature: outline as Feature<Geometry>,
  }));
