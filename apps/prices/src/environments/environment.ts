import { Environment } from '@travellers-apps/utils-common';
import { SupportedLang } from '@travellers-apps/prices/localization';

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
