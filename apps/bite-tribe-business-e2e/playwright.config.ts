import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Where the business Angular dev server is served. The business `serve` target
// uses port 4300 so it never collides with the consumer app on 4200.
// Overridable so the same suite can run against a deployed/preview URL.
const baseURL = process.env['BASE_URL'] ?? 'http://localhost:4300';

/**
 * E2E setup for bite-tribe-business.
 *
 * Mirrors apps/bite-tribe-e2e: Playwright orchestrates two servers before the
 * tests run:
 *   1. the Firebase emulators (auth/firestore/storage/functions/pubsub), seeded
 *      from apps/bite-tribe-firebase/.firebase-export — the *same* emulator
 *      stack the consumer suite uses
 *   2. the business Angular dev server, which auto-connects to those emulators
 *      because NX_APP_BITE_TRIBE_IS_DEV=true
 *
 * Both suites share the emulator ports, so never run them at the same time.
 * See ssot/pages/Implementation - Testing.md.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src/tests' }),
  // The Nx preset leaves the html reporter on Playwright's default
  // `open: 'on-failure'`, which serves the report and never exits when a test
  // fails — that hangs CI and keeps the emulator ports held locally.
  reporter: [
    [
      'html',
      {
        outputFolder:
          '../../dist/.playwright/apps/bite-tribe-business-e2e/playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The business app resolves the current position via the browser
    // Geolocation API after login. The restaurant selector only resolves once a
    // position is known, so grant it and pin a fixed location. Roughly central
    // Munich, same as the consumer suite.
    permissions: ['geolocation'],
    geolocation: { latitude: 48.137154, longitude: 11.576124 },
  },
  webServer: [
    {
      command: 'npx nx firebase-serve bite-tribe-firebase',
      cwd: workspaceRoot,
      // The Emulator UI comes up once the emulators are listening.
      url: 'http://127.0.0.1:4000',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      // Firebase starts Java and Node child processes. Let its CLI handle SIGINT
      // so those emulators exit too; Playwright's default SIGKILL can strand the
      // UI while Auth is already gone, making the next run reuse a broken stack.
      gracefulShutdown: { signal: 'SIGINT', timeout: 10_000 },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npx nx serve bite-tribe-business',
      cwd: workspaceRoot,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
