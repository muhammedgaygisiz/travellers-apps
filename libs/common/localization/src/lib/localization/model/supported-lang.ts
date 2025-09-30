 
export enum SupportedLang {
  EN = 'en',
  DE = 'de',
  DE_DE = 'de-DE',
  DE_CH = 'de-CH',
  FR = 'fr',
  TR = 'tr',
}

// Map display language to locale for number formatting
export const LANG_TO_LOCALE_MAP: Record<string, string> = {
  [SupportedLang.EN]: 'en-US',
  [SupportedLang.DE]: 'de-DE',
  [SupportedLang.DE_DE]: 'de-DE',
  [SupportedLang.DE_CH]: 'de-CH',
  [SupportedLang.FR]: 'fr-FR',
  [SupportedLang.TR]: 'tr-TR',
};
