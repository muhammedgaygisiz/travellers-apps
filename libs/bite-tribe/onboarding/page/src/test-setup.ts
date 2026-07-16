import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// A no-op Worker stub so image-upload's compression/cropper deps load under jsdom.
/* eslint-disable @typescript-eslint/no-empty-function */
(globalThis as typeof globalThis & { Worker?: unknown }).Worker ??= class {
  postMessage(): void {}
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
};
/* eslint-enable @typescript-eslint/no-empty-function */

URL.createObjectURL ??= jest.fn(() => 'blob:mock');
URL.revokeObjectURL ??= jest.fn();
HTMLCanvasElement.prototype.getContext = jest.fn();

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
