import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Where the Angular dev server is served. Overridable so the same suite can run
// against a deployed/preview URL in CI if we ever want to.
const baseURL = process.env['BASE_URL'] ?? 'http://localhost:4200';

/**
 * E2E setup for bite-tribe.
 *
 * Playwright orchestrates two servers before the tests run:
 *   1. the Firebase emulators (auth/firestore/storage/functions/pubsub), seeded
 *      from apps/bite-tribe-firebase/.firebase-export
 *   2. the Angular dev server, which auto-connects to those emulators because
 *      NX_APP_BITE_TRIBE_IS_DEV=true (see apps/bite-tribe/.env)
 *
 * This mirrors the `npm run development` workflow.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src/tests' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npx nx firebase-serve bite-tribe-firebase',
      cwd: workspaceRoot,
      // The Emulator UI comes up once the emulators are listening.
      url: 'http://127.0.0.1:4000',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npx nx serve bite-tribe',
      cwd: workspaceRoot,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
