import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Where the admin Angular dev server is served for this suite. Not the admin
// `serve` target's own 4500: the Firebase emulator suite reserves 4500 for its
// logging port, so with the emulators up the admin server could not start.
// Overridable so the same suite can run against a deployed/preview URL.
const ADMIN_E2E_PORT = 4600;
const baseURL = process.env['BASE_URL'] ?? `http://localhost:${ADMIN_E2E_PORT}`;

/**
 * E2E setup for bite-tribe-admin (GitHub issue #1952).
 *
 * Mirrors apps/bite-tribe-business-e2e: Playwright starts the Firebase
 * emulators, seeded from apps/bite-tribe-firebase/.firebase-export, and the
 * admin dev server, which connects to them because
 * NX_APP_BITE_TRIBE_IS_DEV=true.
 *
 * All three suites share the emulator ports, so never run two at the same
 * time. See ssot/implementation/testing.md.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src/tests' }),
  // The preset's html reporter opens on failure and never exits, which hangs
  // CI and keeps the emulator ports held locally.
  reporter: [
    [
      'html',
      {
        outputFolder:
          '../../dist/.playwright/apps/bite-tribe-admin-e2e/playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The Create Restaurant map centres on the device position; pin one so the
    // click that places the restaurant lands somewhere fixed. Central Munich,
    // as in the other suites.
    permissions: ['geolocation'],
    geolocation: { latitude: 48.137154, longitude: 11.576124 },
  },
  webServer: [
    {
      command: 'npx nx firebase-serve bite-tribe-firebase',
      cwd: workspaceRoot,
      url: 'http://127.0.0.1:4000',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      // Let the Firebase CLI shut its Java and Node children down itself.
      gracefulShutdown: { signal: 'SIGINT', timeout: 10_000 },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx nx serve bite-tribe-admin --port ${ADMIN_E2E_PORT}`,
      cwd: workspaceRoot,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
