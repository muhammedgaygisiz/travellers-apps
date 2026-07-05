import { Bite } from 'model';

const toLocalizedRegionName = (
  region: string,
  lang: string,
): string | undefined => {
  const regionDisplayNames = new Intl.DisplayNames([lang], { type: 'region' });

  return regionDisplayNames.of(region) || region;
};

export const getLocalizedRegionName = (bite: Bite, lang: string): string => {
  if (bite.city && bite.countryCode) {
    return `${bite.city}, ${toLocalizedRegionName(bite.countryCode, lang)}`;
  }

  if (bite.city && !bite.countryCode) {
    return `${bite.city}`;
  }

  if (!bite.city && bite.countryCode) {
    return `${toLocalizedRegionName(bite.countryCode, lang)}`;
  }

  return '';
};
