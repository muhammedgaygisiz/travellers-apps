import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless/index';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
