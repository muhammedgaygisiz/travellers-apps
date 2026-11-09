// Builds BiteTribe for an iOS simulator against a chosen Firebase backend and
// launches it with a known App Check debug token (issue 1221).
//
//   npm run ios:simulator -- --backend=qa [--udid=<UDID>] [--enforced] [--skip-web]
//
// The web bundle is always `--configuration=production`, so the simulator runs
// the same bundle TestFlight ships (issue 1219). Only the backend varies: the
// NX_APP_BITE_TRIBE_* values (production: apps/bite-tribe/.env; otherwise only
// apps/bite-tribe-firebase/backends/<name>.json) and the GoogleService-Info.plist (the
// "Select Firebase Backend" Xcode build phase).
//
// The debug token is read from BITETRIBE_IOS_APP_CHECK_DEBUG_TOKEN, in the
// shell or in the gitignored apps/bite-tribe-ios/.env, and handed to the app as
// the AppCheckDebugToken environment variable. `xcrun simctl launch` ignores
// the Xcode scheme's environment, so it goes in as SIMCTL_CHILD_*.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const BACKENDS = ['qa', 'production'];
const BUNDLE_ID = 'com.bitetribe.app';
const WORKSPACE = resolve('apps/bite-tribe-ios/ios/App/App.xcworkspace');
const DERIVED_DATA = resolve('apps/bite-tribe-ios/ios/DerivedData/simulator');
const APP_PATH = resolve(
  DERIVED_DATA,
  'Build/Products/Debug-iphonesimulator/App.app',
);
const IOS_ENV_FILE = resolve('apps/bite-tribe-ios/.env');
const PUBLIC_DIR = resolve('apps/bite-tribe-ios/ios/App/App/public');

const { values } = parseArgs({
  options: {
    backend: { type: 'string' },
    udid: { type: 'string' },
    enforced: { type: 'boolean', default: false },
    'skip-web': { type: 'boolean', default: false },
  },
});

const backend = values.backend;
if (!BACKENDS.includes(backend)) {
  fail(`--backend is required: one of ${BACKENDS.join(', ')}.`);
}

const udid = values.udid ?? bootedSimulator();
const localEnv = readEnvFile(IOS_ENV_FILE);
const debugToken =
  process.env.BITETRIBE_IOS_APP_CHECK_DEBUG_TOKEN ??
  localEnv.BITETRIBE_IOS_APP_CHECK_DEBUG_TOKEN ??
  '';

if (backend === 'production' && debugToken) {
  console.warn(
    'warning: a debug token registered on bite-tribe is a standing App Check ' +
      'bypass on production. Delete it in the console when the session ends.',
  );
}

if (!values['skip-web']) {
  const buildEnv = { ...process.env, ...backendEnv(backend) };
  if (values.enforced) {
    buildEnv.NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED = 'true';
  }
  run(
    'npx',
    [
      'nx',
      'build',
      'bite-tribe',
      '--configuration=production',
      '--skip-nx-cache',
    ],
    { env: buildEnv },
  );
  run('npm', ['run', 'cap:sync:ios']);
}

run('xcodebuild', [
  '-workspace',
  WORKSPACE,
  '-scheme',
  'App',
  '-configuration',
  'Debug',
  '-sdk',
  'iphonesimulator',
  '-destination',
  `platform=iOS Simulator,id=${udid}`,
  '-derivedDataPath',
  DERIVED_DATA,
  `BITETRIBE_FIREBASE_BACKEND=${backend}`,
  // The home-screen icon names the stage too: AppIcon-QA for QA, the
  // production icon otherwise. Only the Debug configuration honours it.
  `BITETRIBE_APP_ICON=${backend === 'qa' ? 'AppIcon-QA' : 'AppIcon'}`,
  'build',
]);

const plistProject = execFileSync(
  '/usr/libexec/PlistBuddy',
  ['-c', 'Print :PROJECT_ID', `${APP_PATH}/GoogleService-Info.plist`],
  { encoding: 'utf8' },
).trim();
const expectedProject = backend === 'qa' ? 'bite-tribe-qa' : 'bite-tribe';
if (plistProject !== expectedProject) {
  fail(`The built app carries ${plistProject}, expected ${expectedProject}.`);
}

// --skip-web reuses whatever the last sync left, which may be the other
// backend's bundle: the native plugins and the JS SDK would then talk to two
// different projects.
const webProject = syncedWebProject();
if (webProject !== expectedProject) {
  fail(
    `The synced web bundle targets ${webProject ?? 'no project'}, expected ` +
      `${expectedProject}. Run again without --skip-web.`,
  );
}

run('xcrun', ['simctl', 'install', udid, APP_PATH]);
run('xcrun', ['simctl', 'terminate', udid, BUNDLE_ID], { allowFailure: true });
run('xcrun', ['simctl', 'launch', udid, BUNDLE_ID], {
  env: debugToken
    ? { ...process.env, SIMCTL_CHILD_AppCheckDebugToken: debugToken }
    : process.env,
});

console.log(
  `\nLaunched on ${udid} against ${plistProject}` +
    (debugToken
      ? ' with the configured App Check debug token.'
      : '. No debug token configured: the app prints a per-install one ' +
        '(see Implementation - iOS Simulator Testing).'),
);

function backendEnv(name) {
  if (name === 'production') {
    return {};
  }
  const file = resolve(`apps/bite-tribe-firebase/backends/${name}.json`);
  const entries = Object.entries(JSON.parse(readFileSync(file, 'utf8')));
  return {
    ...Object.fromEntries(entries.filter(([key]) => key.startsWith('NX_'))),
    // Without this Nx still merges apps/bite-tribe/.env underneath, and
    // dotenv-expand treats an empty shell value as unset, so a key this file
    // blanks (the reCAPTCHA site key) came back with its production value.
    NX_LOAD_DOT_ENV_FILES: 'false',
  };
}

function syncedWebProject() {
  for (const file of readdirSync(PUBLIC_DIR)) {
    if (!file.endsWith('.js')) {
      continue;
    }
    const match = readFileSync(resolve(PUBLIC_DIR, file), 'utf8').match(
      /NX_APP_BITE_TRIBE_PROJECT_ID:[`"']([^`"']+)/,
    );
    if (match) {
      return match[1];
    }
  }
  return null;
}

function bootedSimulator() {
  const { devices } = JSON.parse(
    execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'], {
      encoding: 'utf8',
    }),
  );
  const booted = Object.values(devices).flat();
  if (booted.length !== 1) {
    fail(
      `${booted.length} simulators are booted; pass --udid=<UDID> to pick one.`,
    );
  }
  return booted[0].udid;
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2');
        return [line.slice(0, index).trim(), value];
      }),
  );
}

function run(command, args, { env = process.env, allowFailure = false } = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.status !== 0 && !allowFailure) {
    fail(`${command} ${args.join(' ')} exited with ${result.status}.`);
  }
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
