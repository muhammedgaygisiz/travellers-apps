import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// `ngx-image-cropper`, reached through `image-upload` on the new-restaurant
// form, touches this at module scope and jsdom does not ship it.
URL.createObjectURL = jest.fn(() => 'blob:mock-url');
