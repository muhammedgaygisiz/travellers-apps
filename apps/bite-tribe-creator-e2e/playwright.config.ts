import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// The creator `serve` target's own port. Overridable so the same suite can run
// against a deployed or preview URL.
const CREATOR_E2E_PORT = 4700;
const baseURL =
  process.env['BASE_URL'] ?? `http://localhost:${CREATOR_E2E_PORT}`;

/**
 * E2E setup for bite-tribe-creator (GitHub issue #2130).
 *
 * Mirrors apps/bite-tribe-admin-e2e: Playwright starts the Firebase
 * emulators, seeded from apps/bite-tribe-firebase/.firebase-export, and the
 * creator dev server, which connects to them because
 * NX_APP_BITE_TRIBE_IS_DEV=true.
 *
 * All four suites share the emulator ports, so never run two at the same
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
          '../../dist/.playwright/apps/bite-tribe-creator-e2e/playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
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
      command: `npx nx serve bite-tribe-creator --port ${CREATOR_E2E_PORT}`,
      cwd: workspaceRoot,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
