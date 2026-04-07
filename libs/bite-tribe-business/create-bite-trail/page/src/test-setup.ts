import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

import '@angular/localize/init';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

URL.createObjectURL = jest.fn(() => 'blob:mock-url');
