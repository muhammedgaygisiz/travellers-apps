const { readFileSync, writeFileSync } = require('node:fs');
const {
  ANDROID_BUILD_GRADLE_PATH,
  IOS_PROJECT_PATH,
  readNativeVersion,
  readPackageVersion,
  writeNativeVersion,
} = require('../../../tools/native-version.mjs');

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const BUILD_GRADLE = [
  'android {',
  '    defaultConfig {',
  '        versionCode 94',
  '        versionName "1.0.0"',
  '    }',
  '}',
].join('\n');

// Xcode declares one per build configuration, so a partial rewrite would ship a
// Debug and a Release build claiming different versions.
const PBXPROJ = [
  'MARKETING_VERSION = 1.0.0;',
  'CURRENT_PROJECT_VERSION = 94;',
  'MARKETING_VERSION = 1.0.0;',
].join('\n');

/** Serves each path the readers ask for, whatever order they ask in. */
const filesystem = (files) => {
  readFileSync.mockImplementation((path) => {
    const match = Object.entries(files).find(([suffix]) =>
      String(path).endsWith(suffix),
    );

    if (!match) {
      throw new Error(`Unexpected read of ${path}`);
    }

    return match[1];
  });
};

const writtenTo = (suffix) =>
  writeFileSync.mock.calls.find(([path]) => String(path).endsWith(suffix))?.[1];

describe('native-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(readPackageVersion.name, () => {
    it('reads the marketing version from package.json', () => {
      filesystem({ 'package.json': '{ "version": "1.0.1" }' });

      expect(readPackageVersion('/workspace')).toBe('1.0.1');
    });

    it('refuses the placeholder the workspace shipped before issue #1303', () => {
      filesystem({ 'package.json': '{ "version": "0.0.0" }' });

      expect(() => readPackageVersion('/workspace')).toThrow(
        'package.json must carry the marketing version',
      );
    });
  });

  describe(readNativeVersion.name, () => {
    it('returns the shared Android and iOS version', () => {
      filesystem({
        [ANDROID_BUILD_GRADLE_PATH]: BUILD_GRADLE,
        [IOS_PROJECT_PATH]: PBXPROJ,
      });

      expect(readNativeVersion('/workspace')).toBe('1.0.0');
    });

    it('throws when Android and iOS versions do not match', () => {
      filesystem({
        [ANDROID_BUILD_GRADLE_PATH]: BUILD_GRADLE,
        [IOS_PROJECT_PATH]: 'MARKETING_VERSION = 1.0.1;',
      });

      expect(() => readNativeVersion('/workspace')).toThrow(
        'Android and iOS versions must exist and match.',
      );
    });
  });

  describe(writeNativeVersion.name, () => {
    it('writes the version into both native projects', () => {
      filesystem({
        [ANDROID_BUILD_GRADLE_PATH]: BUILD_GRADLE,
        [IOS_PROJECT_PATH]: PBXPROJ,
      });

      writeNativeVersion('1.0.1', '/workspace');

      expect(writtenTo(ANDROID_BUILD_GRADLE_PATH)).toContain(
        '        versionName "1.0.1"',
      );
      expect(writtenTo(IOS_PROJECT_PATH)).toBe(
        [
          'MARKETING_VERSION = 1.0.1;',
          'CURRENT_PROJECT_VERSION = 94;',
          'MARKETING_VERSION = 1.0.1;',
        ].join('\n'),
      );
    });

    it('leaves the build number alone', () => {
      filesystem({
        [ANDROID_BUILD_GRADLE_PATH]: BUILD_GRADLE,
        [IOS_PROJECT_PATH]: PBXPROJ,
      });

      writeNativeVersion('1.0.1', '/workspace');

      expect(writtenTo(ANDROID_BUILD_GRADLE_PATH)).toContain('versionCode 94');
      expect(writtenTo(IOS_PROJECT_PATH)).toContain(
        'CURRENT_PROJECT_VERSION = 94;',
      );
    });

    it('throws rather than writing a project it did not recognise', () => {
      filesystem({
        [ANDROID_BUILD_GRADLE_PATH]: 'android {}',
        [IOS_PROJECT_PATH]: PBXPROJ,
      });

      expect(() => writeNativeVersion('1.0.1', '/workspace')).toThrow(
        'Could not find the Android versionName.',
      );
      expect(writeFileSync).not.toHaveBeenCalled();
    });
  });
});
