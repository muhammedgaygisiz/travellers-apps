import { createAction, props } from '@ngrx/store';
import { SupportedLang } from '@travellers-apps/prices/localization';

export const changeLanguage = createAction(
  '[Localization] Change language',
  props<{ lang: SupportedLang }>()
);
