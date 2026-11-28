import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// The shared image-upload, used by the dietary restoration request (#2199),
// loads ngx-image-cropper, which needs it at import time.
URL.createObjectURL = jest.fn(() => 'blob:mock-url');
