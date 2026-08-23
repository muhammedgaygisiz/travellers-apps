export const Filesystem = {
  readFile: jest.fn(),
  checkPermissions: jest.fn(() =>
    Promise.resolve({ publicStorage: 'granted' }),
  ),
};

/**
 * Mirrors the plugin's own enum values. Kept complete rather than trimmed to
 * what a test happens to touch: `LOCAL_IMAGE_DIRECTORY` reads one of these at
 * import time, so a missing member takes down whole suites that never mention
 * the filesystem.
 */
export const Directory = {
  Documents: 'DOCUMENTS',
  Data: 'DATA',
  Library: 'LIBRARY',
  Cache: 'CACHE',
  External: 'EXTERNAL',
  ExternalStorage: 'EXTERNAL_STORAGE',
} as const;
