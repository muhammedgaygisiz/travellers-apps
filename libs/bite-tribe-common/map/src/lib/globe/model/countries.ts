/**
 * The continents a country is counted on. Antarctica and the sub-Antarctic
 * territories count as one of them, so a Bite from a research station still
 * adds a continent.
 */
export type Continent = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';

/**
 * Every ISO 3166-1 country by its alpha-2 code: the ISO numeric code the
 * `world-atlas` outlines are keyed by, and the continent it is counted on.
 *
 * Profiles store alpha-2 (`countryCodes`), the outlines use numeric ids, and
 * neither carries a continent, so this table is the bridge. Transcontinental
 * countries are counted where most of their population lives (Russia in
 * Europe, Türkiye in Asia); Cyprus counts as Europe.
 *
 * Kosovo has no ISO numeric code and its outline carries no id; it is matched
 * by name in {@link countryCodeOfOutline}.
 */
export const COUNTRIES: Record<string, readonly [string, Continent]> = {
  AD: ['020', 'EU'],
  AE: ['784', 'AS'],
  AF: ['004', 'AS'],
  AG: ['028', 'NA'],
  AI: ['660', 'NA'],
  AL: ['008', 'EU'],
  AM: ['051', 'AS'],
  AO: ['024', 'AF'],
  AQ: ['010', 'AN'],
  AR: ['032', 'SA'],
  AS: ['016', 'OC'],
  AT: ['040', 'EU'],
  AU: ['036', 'OC'],
  AW: ['533', 'NA'],
  AX: ['248', 'EU'],
  AZ: ['031', 'AS'],
  BA: ['070', 'EU'],
  BB: ['052', 'NA'],
  BD: ['050', 'AS'],
  BE: ['056', 'EU'],
  BF: ['854', 'AF'],
  BG: ['100', 'EU'],
  BH: ['048', 'AS'],
  BI: ['108', 'AF'],
  BJ: ['204', 'AF'],
  BL: ['652', 'NA'],
  BM: ['060', 'NA'],
  BN: ['096', 'AS'],
  BO: ['068', 'SA'],
  BQ: ['535', 'NA'],
  BR: ['076', 'SA'],
  BS: ['044', 'NA'],
  BT: ['064', 'AS'],
  BV: ['074', 'AN'],
  BW: ['072', 'AF'],
  BY: ['112', 'EU'],
  BZ: ['084', 'NA'],
  CA: ['124', 'NA'],
  CC: ['166', 'AS'],
  CD: ['180', 'AF'],
  CF: ['140', 'AF'],
  CG: ['178', 'AF'],
  CH: ['756', 'EU'],
  CI: ['384', 'AF'],
  CK: ['184', 'OC'],
  CL: ['152', 'SA'],
  CM: ['120', 'AF'],
  CN: ['156', 'AS'],
  CO: ['170', 'SA'],
  CR: ['188', 'NA'],
  CU: ['192', 'NA'],
  CV: ['132', 'AF'],
  CW: ['531', 'NA'],
  CX: ['162', 'AS'],
  CY: ['196', 'EU'],
  CZ: ['203', 'EU'],
  DE: ['276', 'EU'],
  DJ: ['262', 'AF'],
  DK: ['208', 'EU'],
  DM: ['212', 'NA'],
  DO: ['214', 'NA'],
  DZ: ['012', 'AF'],
  EC: ['218', 'SA'],
  EE: ['233', 'EU'],
  EG: ['818', 'AF'],
  EH: ['732', 'AF'],
  ER: ['232', 'AF'],
  ES: ['724', 'EU'],
  ET: ['231', 'AF'],
  FI: ['246', 'EU'],
  FJ: ['242', 'OC'],
  FK: ['238', 'SA'],
  FM: ['583', 'OC'],
  FO: ['234', 'EU'],
  FR: ['250', 'EU'],
  GA: ['266', 'AF'],
  GB: ['826', 'EU'],
  GD: ['308', 'NA'],
  GE: ['268', 'AS'],
  GF: ['254', 'SA'],
  GG: ['831', 'EU'],
  GH: ['288', 'AF'],
  GI: ['292', 'EU'],
  GL: ['304', 'NA'],
  GM: ['270', 'AF'],
  GN: ['324', 'AF'],
  GP: ['312', 'NA'],
  GQ: ['226', 'AF'],
  GR: ['300', 'EU'],
  GS: ['239', 'AN'],
  GT: ['320', 'NA'],
  GU: ['316', 'OC'],
  GW: ['624', 'AF'],
  GY: ['328', 'SA'],
  HK: ['344', 'AS'],
  HM: ['334', 'AN'],
  HN: ['340', 'NA'],
  HR: ['191', 'EU'],
  HT: ['332', 'NA'],
  HU: ['348', 'EU'],
  ID: ['360', 'AS'],
  IE: ['372', 'EU'],
  IL: ['376', 'AS'],
  IM: ['833', 'EU'],
  IN: ['356', 'AS'],
  IO: ['086', 'AS'],
  IQ: ['368', 'AS'],
  IR: ['364', 'AS'],
  IS: ['352', 'EU'],
  IT: ['380', 'EU'],
  JE: ['832', 'EU'],
  JM: ['388', 'NA'],
  JO: ['400', 'AS'],
  JP: ['392', 'AS'],
  KE: ['404', 'AF'],
  KG: ['417', 'AS'],
  KH: ['116', 'AS'],
  KI: ['296', 'OC'],
  KM: ['174', 'AF'],
  KN: ['659', 'NA'],
  KP: ['408', 'AS'],
  KR: ['410', 'AS'],
  KW: ['414', 'AS'],
  KY: ['136', 'NA'],
  KZ: ['398', 'AS'],
  LA: ['418', 'AS'],
  LB: ['422', 'AS'],
  LC: ['662', 'NA'],
  LI: ['438', 'EU'],
  LK: ['144', 'AS'],
  LR: ['430', 'AF'],
  LS: ['426', 'AF'],
  LT: ['440', 'EU'],
  LU: ['442', 'EU'],
  LV: ['428', 'EU'],
  LY: ['434', 'AF'],
  MA: ['504', 'AF'],
  MC: ['492', 'EU'],
  MD: ['498', 'EU'],
  ME: ['499', 'EU'],
  MF: ['663', 'NA'],
  MG: ['450', 'AF'],
  MH: ['584', 'OC'],
  MK: ['807', 'EU'],
  ML: ['466', 'AF'],
  MM: ['104', 'AS'],
  MN: ['496', 'AS'],
  MO: ['446', 'AS'],
  MP: ['580', 'OC'],
  MQ: ['474', 'NA'],
  MR: ['478', 'AF'],
  MS: ['500', 'NA'],
  MT: ['470', 'EU'],
  MU: ['480', 'AF'],
  MV: ['462', 'AS'],
  MW: ['454', 'AF'],
  MX: ['484', 'NA'],
  MY: ['458', 'AS'],
  MZ: ['508', 'AF'],
  NA: ['516', 'AF'],
  NC: ['540', 'OC'],
  NE: ['562', 'AF'],
  NF: ['574', 'OC'],
  NG: ['566', 'AF'],
  NI: ['558', 'NA'],
  NL: ['528', 'EU'],
  NO: ['578', 'EU'],
  NP: ['524', 'AS'],
  NR: ['520', 'OC'],
  NU: ['570', 'OC'],
  NZ: ['554', 'OC'],
  OM: ['512', 'AS'],
  PA: ['591', 'NA'],
  PE: ['604', 'SA'],
  PF: ['258', 'OC'],
  PG: ['598', 'OC'],
  PH: ['608', 'AS'],
  PK: ['586', 'AS'],
  PL: ['616', 'EU'],
  PM: ['666', 'NA'],
  PN: ['612', 'OC'],
  PR: ['630', 'NA'],
  PS: ['275', 'AS'],
  PT: ['620', 'EU'],
  PW: ['585', 'OC'],
  PY: ['600', 'SA'],
  QA: ['634', 'AS'],
  RE: ['638', 'AF'],
  RO: ['642', 'EU'],
  RS: ['688', 'EU'],
  RU: ['643', 'EU'],
  RW: ['646', 'AF'],
  SA: ['682', 'AS'],
  SB: ['090', 'OC'],
  SC: ['690', 'AF'],
  SD: ['729', 'AF'],
  SE: ['752', 'EU'],
  SG: ['702', 'AS'],
  SH: ['654', 'AF'],
  SI: ['705', 'EU'],
  SJ: ['744', 'EU'],
  SK: ['703', 'EU'],
  SL: ['694', 'AF'],
  SM: ['674', 'EU'],
  SN: ['686', 'AF'],
  SO: ['706', 'AF'],
  SR: ['740', 'SA'],
  SS: ['728', 'AF'],
  ST: ['678', 'AF'],
  SV: ['222', 'NA'],
  SX: ['534', 'NA'],
  SY: ['760', 'AS'],
  SZ: ['748', 'AF'],
  TC: ['796', 'NA'],
  TD: ['148', 'AF'],
  TF: ['260', 'AN'],
  TG: ['768', 'AF'],
  TH: ['764', 'AS'],
  TJ: ['762', 'AS'],
  TK: ['772', 'OC'],
  TL: ['626', 'AS'],
  TM: ['795', 'AS'],
  TN: ['788', 'AF'],
  TO: ['776', 'OC'],
  TR: ['792', 'AS'],
  TT: ['780', 'NA'],
  TV: ['798', 'OC'],
  TW: ['158', 'AS'],
  TZ: ['834', 'AF'],
  UA: ['804', 'EU'],
  UG: ['800', 'AF'],
  UM: ['581', 'OC'],
  US: ['840', 'NA'],
  UY: ['858', 'SA'],
  UZ: ['860', 'AS'],
  VA: ['336', 'EU'],
  VC: ['670', 'NA'],
  VE: ['862', 'SA'],
  VG: ['092', 'NA'],
  VI: ['850', 'NA'],
  VN: ['704', 'AS'],
  VU: ['548', 'OC'],
  WF: ['876', 'OC'],
  WS: ['882', 'OC'],
  XK: ['', 'EU'],
  YE: ['887', 'AS'],
  YT: ['175', 'AF'],
  ZA: ['710', 'AF'],
  ZM: ['894', 'AF'],
  ZW: ['716', 'AF'],
};

const ALPHA2_BY_NUMERIC: ReadonlyMap<string, string> = new Map(
  Object.entries(COUNTRIES)
    .filter(([, [numeric]]) => numeric)
    .map(([alpha2, [numeric]]) => [numeric, alpha2]),
);

/** The outline names that carry no id but do name an ISO country. */
const ALPHA2_BY_UNNUMBERED_NAME: Readonly<Record<string, string>> = {
  Kosovo: 'XK',
};

/**
 * The alpha-2 code of a `world-atlas` outline, from its numeric id or, for the
 * few outlines without one, its name. `undefined` for an outline that is no
 * ISO country (Somaliland, Northern Cyprus, Siachen Glacier).
 */
export const countryCodeOfOutline = (
  id: string | number | undefined,
  name: string | undefined,
): string | undefined => {
  if (id !== undefined && id !== null && `${id}` !== '') {
    return ALPHA2_BY_NUMERIC.get(`${id}`.padStart(3, '0'));
  }

  return name ? ALPHA2_BY_UNNUMBERED_NAME[name] : undefined;
};

/**
 * The profile's country codes, trimmed, upper-cased and de-duplicated, in the
 * order they were given. The same clean-up the flag row applies, so the globe
 * and the flags count the same countries.
 */
export const normalizeCountryCodes = (
  countryCodes: readonly (string | null | undefined)[] | null | undefined,
): string[] => [
  ...new Set(
    (countryCodes ?? [])
      .map((code) => code?.trim().toUpperCase())
      .filter((code): code is string => !!code),
  ),
];

/** How many distinct continents the given countries lie on. */
export const countContinents = (
  countryCodes: readonly (string | null | undefined)[] | null | undefined,
): number =>
  new Set(
    normalizeCountryCodes(countryCodes)
      .map((code) => COUNTRIES[code]?.[1])
      .filter((continent): continent is Continent => !!continent),
  ).size;
