import {
  Environment,
  SupportedLang,
} from '@travellers-apps/prices/shell/feature';

export const environment: Environment = {
  production: false,
  i18n: {
    locales: [
      SupportedLang.EN,
      SupportedLang.FR,
      SupportedLang.DE,
      SupportedLang.TR,
    ],
  },
};
