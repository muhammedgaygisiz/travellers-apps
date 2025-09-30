export enum SupportedLang {
  EN = 'en',
  DE = 'de',
  FR = 'fr',
  TR = 'tr',
  ES = 'es',
}

// Map display language to locale for number formatting
export const LANG_TO_LOCALE_MAP: Record<string, string> = {
  [SupportedLang.EN]: 'en-US',
  [SupportedLang.DE]: 'de-DE',
  [SupportedLang.FR]: 'fr-FR',
  [SupportedLang.TR]: 'tr-TR',
  [SupportedLang.ES]: 'es-ES',
};
