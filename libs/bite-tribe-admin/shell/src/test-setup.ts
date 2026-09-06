import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Resolving the lazy routes pulls in the new-restaurant form, and through it
// `ngx-image-cropper`, which touches this at module scope. jsdom has no
// implementation.
URL.createObjectURL = jest.fn(() => 'blob:mock-url');
