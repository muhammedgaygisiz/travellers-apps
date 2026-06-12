const { readBuildNumber } = require('../read-build-number');

describe(readBuildNumber.name, () => {
  it('returns the shared Android and iOS build number', () => {
    const readFile = jest
      .fn()
      .mockReturnValueOnce('android {\n  versionCode 76\n}')
      .mockReturnValueOnce(
        ['CURRENT_PROJECT_VERSION = 76;', 'CURRENT_PROJECT_VERSION = 76;'].join(
          '\n',
        ),
      );

    expect(readBuildNumber('/workspace', readFile)).toBe('76');
  });

  it('throws when a build number is missing', () => {
    const readFile = jest
      .fn()
      .mockReturnValueOnce('android {}')
      .mockReturnValueOnce('CURRENT_PROJECT_VERSION = 76;');

    expect(() => readBuildNumber('/workspace', readFile)).toThrow(
      'Android and iOS build numbers must exist and match.',
    );
  });

  it('throws when Android and iOS build numbers do not match', () => {
    const readFile = jest
      .fn()
      .mockReturnValueOnce('versionCode 76')
      .mockReturnValueOnce('CURRENT_PROJECT_VERSION = 77;');

    expect(() => readBuildNumber('/workspace', readFile)).toThrow(
      'Android and iOS build numbers must exist and match.',
    );
  });
});
