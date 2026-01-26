// Radius of the Earth depending on unit
const radiusMap: Record<string, number> = {
  km: 6371,
  m: 6371000,
  mi: 3958.8,
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const haversineDistance = (
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number,
  unit = 'km',
): string | undefined => {
  const R = radiusMap[unit] || radiusMap['km']; // Default to kilometers

  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return undefined;
  }

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const rad1 = toRad(lat1);
  const rad2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad1) * Math.cos(rad2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (R * c).toFixed(2);
};
