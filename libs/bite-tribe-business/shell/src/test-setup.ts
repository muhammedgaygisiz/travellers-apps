import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// The routes spec resolves every lazy `loadComponent`, which reaches
// `ngx-image-cropper` through three of the feature libraries. That module calls
// `URL.createObjectURL` at import time and jsdom does not implement it, so the
// import throws before any assertion runs. Every project whose tests reach the
// cropper carries this same line.
URL.createObjectURL = jest.fn(() => 'blob:mock-url');
