import { Environment } from '@travellers-apps/utils-common';
import { SupportedLang } from 'localization';

export const environment: Environment = {
  production: true,
  i18n: {
    locales: [
      SupportedLang.EN,
      SupportedLang.FR,
      SupportedLang.DE,
      SupportedLang.TR,
    ],
  },
};
