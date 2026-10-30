// ion-icon resolves an icon that was not registered through addIcons() as
// `new URL('svg/<name>.svg', assetPath)`. Ionic leaves the asset path empty
// until an app sets it, and jsdom rejects an empty base, so every such icon
// logged an "Invalid base URL" stack trace and an Ionicons warning (#1814).
// Pointing it at the jsdom origin lets the lookup fall through to the fetch
// mock quietly instead.
//
// Projects whose transformIgnorePatterns do not cover @ionic cannot load it;
// they never render an ion-icon either, so they are skipped.
try {
  require('@ionic/core/components').setAssetPath(document.baseURI);
} catch {
  // not an Ionic project
}
