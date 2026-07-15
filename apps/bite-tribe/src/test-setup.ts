import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// The onboarding route is imported statically in the shell (its guards must be),
// so app-level specs eagerly evaluate image-upload -> image-compression ->
// heic2any, which touches Worker/canvas at module load. jsdom provides neither,
// so stub them the same way the onboarding library's test-setup does.
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

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
