// `@ionic/core` ships untranspiled ESM, and the toast controller pulls it in
// through `@ionic/angular/standalone`. Without these entries Jest parses the
// bundle as CommonJS and fails on its first `export`.
const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@stencil',
  '@jsverse',
].join('|');

export default {
  displayName: 'toast',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  globals: {},
  coverageDirectory: '../../../coverage/libs/common/toast',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [`node_modules/(?!(${NODE_MODULES_TO_IGNORE}))`],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
