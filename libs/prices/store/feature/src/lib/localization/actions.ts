import { createAction, props } from '@ngrx/store';
import { SupportedLang } from 'localization';

export const changeLanguage = createAction(
  '[Localization] Change language',
  props<{ lang: SupportedLang }>()
);
