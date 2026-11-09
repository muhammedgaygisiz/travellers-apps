// Builds BiteTribe for Android against bite-tribe-qa and installs it on the
// connected device or emulator (issue 1221).
//
//   npm run android:qa [-- --skip-web]
//
// Like the iOS runner, only the backend varies: the production web bundle
// built from apps/bite-tribe-firebase/backends/qa.json, and the `qa` build
// type, whose src/qa carries the QA google-services.json and the QA icon.
//
// The qa build uses the debug App Check provider. On first launch it logs
// "Enter this debug secret into the allow list..." to logcat; register that
// secret on the bite-tribe-qa Android app, never on production.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { backendEnv } from './firebase-backend-env.mjs';

const ANDROID_DIR = resolve('apps/bite-tribe-android/android');

// Gradle rejects a JDK newer than 24; Android Studio bundles one it accepts.
// tools/build-android-release.mjs makes the same fallback.
const STUDIO_JDK =
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
const gradleEnv =
  !process.env.JAVA_HOME && existsSync(STUDIO_JDK)
    ? { ...process.env, JAVA_HOME: STUDIO_JDK }
    : process.env;

const { values } = parseArgs({
  options: { 'skip-web': { type: 'boolean', default: false } },
});

if (!values['skip-web']) {
  run(
    'npx',
    [
      'nx',
      'build',
      'bite-tribe',
      '--configuration=production',
      '--skip-nx-cache',
    ],
    { env: { ...process.env, ...backendEnv('qa') } },
  );
  run('npx', ['nx', 'run', 'bite-tribe-android:sync']);
}

run('./gradlew', ['installQa'], { cwd: ANDROID_DIR, env: gradleEnv });
run('adb', ['shell', 'am', 'start', '-n', 'com.bitetribe.app/.MainActivity']);

console.log('\nInstalled and launched the qa build against bite-tribe-qa.');

function run(command, args, { env = process.env, cwd } = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, cwd });
  if (result.status !== 0) {
    console.error(
      `error: ${command} ${args.join(' ')} exited with ${result.status}.`,
    );
    process.exit(1);
  }
}
