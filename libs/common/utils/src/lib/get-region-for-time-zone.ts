/**
 * IANA time zones per region. There is no platform API that maps a time zone to
 * a country, so the mapping is explicit. It covers the regions BiteTribe knows a
 * currency for plus their common aliases; anything unmapped resolves to
 * `undefined` so callers can fall back to another region signal.
 *
 * Only zones a user's device can plausibly be set to are listed. A missing zone
 * costs nothing beyond falling back — it never produces a wrong region.
 */
const TIME_ZONES_BY_REGION: Readonly<Record<string, readonly string[]>> = {
  AE: ['Asia/Dubai'],
  AR: [
    'America/Argentina/Buenos_Aires',
    'America/Argentina/Cordoba',
    'America/Argentina/Mendoza',
    'America/Argentina/Salta',
    'America/Argentina/Tucuman',
    'America/Argentina/Ushuaia',
    'America/Buenos_Aires',
  ],
  AT: ['Europe/Vienna'],
  AU: [
    'Australia/Adelaide',
    'Australia/Brisbane',
    'Australia/Canberra',
    'Australia/Darwin',
    'Australia/Hobart',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Sydney',
  ],
  BE: ['Europe/Brussels'],
  BR: [
    'America/Bahia',
    'America/Belem',
    'America/Boa_Vista',
    'America/Campo_Grande',
    'America/Cuiaba',
    'America/Fortaleza',
    'America/Manaus',
    'America/Porto_Velho',
    'America/Recife',
    'America/Rio_Branco',
    'America/Sao_Paulo',
  ],
  CA: [
    'America/Edmonton',
    'America/Halifax',
    'America/Moncton',
    'America/Montreal',
    'America/Regina',
    'America/St_Johns',
    'America/Toronto',
    'America/Vancouver',
    'America/Whitehorse',
    'America/Winnipeg',
  ],
  CH: ['Europe/Zurich'],
  CL: ['America/Punta_Arenas', 'America/Santiago', 'Pacific/Easter'],
  CN: ['Asia/Chongqing', 'Asia/Harbin', 'Asia/Shanghai', 'Asia/Urumqi'],
  CO: ['America/Bogota'],
  CZ: ['Europe/Prague'],
  DE: ['Europe/Berlin', 'Europe/Busingen'],
  DK: ['Europe/Copenhagen'],
  EG: ['Africa/Cairo'],
  ES: ['Africa/Ceuta', 'Atlantic/Canary', 'Europe/Madrid'],
  ET: ['Africa/Addis_Ababa'],
  FI: ['Europe/Helsinki'],
  FR: ['Europe/Paris'],
  GB: ['Europe/London'],
  GR: ['Europe/Athens'],
  HK: ['Asia/Hong_Kong'],
  HU: ['Europe/Budapest'],
  ID: ['Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar', 'Asia/Pontianak'],
  IE: ['Europe/Dublin'],
  IL: ['Asia/Jerusalem', 'Asia/Tel_Aviv'],
  IN: ['Asia/Calcutta', 'Asia/Kolkata'],
  IT: ['Europe/Rome'],
  JP: ['Asia/Tokyo'],
  KR: ['Asia/Seoul'],
  MA: ['Africa/Casablanca'],
  MX: [
    'America/Bahia_Banderas',
    'America/Cancun',
    'America/Chihuahua',
    'America/Hermosillo',
    'America/Matamoros',
    'America/Mazatlan',
    'America/Merida',
    'America/Mexico_City',
    'America/Monterrey',
    'America/Tijuana',
  ],
  MY: ['Asia/Kuala_Lumpur', 'Asia/Kuching'],
  NG: ['Africa/Lagos'],
  NL: ['Europe/Amsterdam'],
  NO: ['Europe/Oslo'],
  NZ: ['Pacific/Auckland', 'Pacific/Chatham'],
  PE: ['America/Lima'],
  PH: ['Asia/Manila'],
  PK: ['Asia/Karachi'],
  PL: ['Europe/Warsaw'],
  PT: ['Atlantic/Azores', 'Atlantic/Madeira', 'Europe/Lisbon'],
  RO: ['Europe/Bucharest'],
  RS: ['Europe/Belgrade'],
  RU: [
    'Asia/Irkutsk',
    'Asia/Kamchatka',
    'Asia/Krasnoyarsk',
    'Asia/Magadan',
    'Asia/Novosibirsk',
    'Asia/Omsk',
    'Asia/Sakhalin',
    'Asia/Vladivostok',
    'Asia/Yakutsk',
    'Asia/Yekaterinburg',
    'Europe/Kaliningrad',
    'Europe/Moscow',
    'Europe/Samara',
    'Europe/Volgograd',
  ],
  SA: ['Asia/Riyadh'],
  SE: ['Europe/Stockholm'],
  SG: ['Asia/Singapore'],
  TH: ['Asia/Bangkok'],
  TR: ['Asia/Istanbul', 'Europe/Istanbul'],
  TW: ['Asia/Taipei'],
  UA: ['Europe/Kiev', 'Europe/Kyiv'],
  US: [
    'America/Adak',
    'America/Anchorage',
    'America/Boise',
    'America/Chicago',
    'America/Denver',
    'America/Detroit',
    'America/Indiana/Indianapolis',
    'America/Juneau',
    'America/Kentucky/Louisville',
    'America/Los_Angeles',
    'America/Menominee',
    'America/New_York',
    'America/Nome',
    'America/Phoenix',
    'Pacific/Honolulu',
  ],
  VN: ['Asia/Ho_Chi_Minh', 'Asia/Saigon'],
  ZA: ['Africa/Johannesburg'],
};

const REGION_BY_TIME_ZONE: ReadonlyMap<string, string> = new Map(
  Object.entries(TIME_ZONES_BY_REGION).flatMap(([region, timeZones]) =>
    timeZones.map((timeZone): [string, string] => [
      timeZone.toLowerCase(),
      region,
    ]),
  ),
);

/**
 * Region a device sits in, derived from its IANA time zone, e.g.
 * `Europe/Zurich` -> `CH`.
 *
 * The time zone is the only region signal a web view gets for free: iOS reports
 * the interface language through `navigator.language`, and the language keeps
 * the variant the user picked (`en-GB`) even when the device Region says
 * something else entirely (issue #1262). Returns `undefined` for an unknown or
 * missing zone.
 */
export function getRegionForTimeZone(
  timeZone: string | undefined,
): string | undefined {
  if (!timeZone) {
    return undefined;
  }

  return REGION_BY_TIME_ZONE.get(timeZone.trim().toLowerCase());
}
