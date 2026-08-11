import {
  readNativeVersion,
  readPackageVersion,
  writeNativeVersion,
} from './native-version.mjs';

const version = readPackageVersion();

writeNativeVersion(version);

const nativeVersion = readNativeVersion();

if (nativeVersion !== version) {
  throw new Error(
    `Native version is ${nativeVersion} after syncing ${version}.`,
  );
}

console.log(`Native marketing version synced to ${version}.`);
