import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// Gradle rejects a JDK newer than this, so a shell whose default `java` is
// newer fails during configuration with "Unsupported class file major version".
const MAX_SUPPORTED_JAVA_MAJOR = 24;

const ANDROID_DIR = resolve('apps/bite-tribe-android/android');
const BUNDLE_PATH = resolve(
  ANDROID_DIR,
  'app/build/outputs/bundle/release/app-release.aab',
);

// The BiteTribe upload key, as recorded in the Play Console under
// App signing > Upload key certificate. A different fingerprint means the wrong
// keystore signed the bundle and Play would reject the upload.
const EXPECTED_SHA256 =
  process.env.BITETRIBE_EXPECTED_UPLOAD_SHA256 ??
  '34:67:17:77:36:90:77:DD:04:C6:90:9B:D9:22:C2:F8:F6:99:FC:02:D4:28:07:08:12:2C:59:46:50:45:27:AF';

const javaHome = resolveJavaHome();
console.log(`Using JDK: ${javaHome}`);

run('./gradlew', ['bundleRelease'], {
  cwd: ANDROID_DIR,
  env: { ...process.env, JAVA_HOME: javaHome },
});

if (!existsSync(BUNDLE_PATH)) {
  fail(`Gradle reported success but no bundle exists at ${BUNDLE_PATH}.`);
}

verifySignature(javaHome);

const megabytes = (statSync(BUNDLE_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\nSigned bundle ready (${megabytes} MB):\n${BUNDLE_PATH}`);

function verifySignature(javaHome) {
  let output;

  try {
    output = execFileSync(
      resolve(javaHome, 'bin/keytool'),
      ['-printcert', '-jarfile', BUNDLE_PATH],
      { encoding: 'utf8' },
    );
  } catch {
    fail(
      [
        'Could not read a signing certificate from the bundle.',
        'The release build stays unsigned when signing credentials are missing,',
        'so check apps/bite-tribe-android/android/keystore.properties or the',
        'BITETRIBE_KEYSTORE_* environment variables.',
      ].join('\n'),
    );
  }

  const fingerprint = output.match(/SHA256:\s*([0-9A-F:]+)/i)?.[1];

  if (!fingerprint) {
    fail(
      'The bundle carries no SHA-256 certificate fingerprint; it is unsigned.',
    );
  }

  if (fingerprint.toUpperCase() !== EXPECTED_SHA256.toUpperCase()) {
    fail(
      [
        'The bundle was signed with an unexpected key.',
        `  expected: ${EXPECTED_SHA256}`,
        `  actual:   ${fingerprint}`,
        'Do not upload it. Confirm which keystore keystore.properties points at.',
      ].join('\n'),
    );
  }

  console.log(
    `\nSignature verified against the Play upload key:\n${fingerprint}`,
  );
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    ...[21, 17].map((version) => macJavaHome(version)),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(resolve(candidate, 'bin/java'))) {
      const major = javaMajorVersion(candidate);

      if (major && major <= MAX_SUPPORTED_JAVA_MAJOR) {
        return candidate;
      }
    }
  }

  fail(
    [
      `No JDK ${MAX_SUPPORTED_JAVA_MAJOR} or older was found.`,
      'Gradle cannot run on a newer JDK. Install one, or point JAVA_HOME at the',
      'JDK bundled with Android Studio:',
      '  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"',
    ].join('\n'),
  );
}

function macJavaHome(version) {
  try {
    return execFileSync('/usr/libexec/java_home', ['-v', String(version)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function javaMajorVersion(javaHome) {
  // `java -version` writes to stderr, so both streams have to be read.
  const result = spawnSync(resolve(javaHome, 'bin/java'), ['-version'], {
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  return Number(output.match(/version "(\d+)/)?.[1]) || null;
}

function run(command, args, options) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
