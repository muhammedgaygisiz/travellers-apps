import { InjectionToken } from '@angular/core';

export const APP_TITLE = new InjectionToken<string>('app-title');

export const AFTER_LOGOUT_PAGE = new InjectionToken<string>(
  'after-logout-page',
);
export const AFTER_LOGIN_PAGE = new InjectionToken<string>('after-login-page');
