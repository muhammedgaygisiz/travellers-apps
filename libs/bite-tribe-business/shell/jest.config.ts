// The shell's route table reaches the shared auth routes, which pull in the
// Ionic, Stencil and Transloco ESM bundles. The default `.mjs`-only ignore
// leaves those untransformed and the suite dies on `Unexpected token 'export'`
// before a single test runs. This is the list every library with an Ionic
// dependency already carries.
const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@stencil',
  '@capacitor',
  '@jsverse',
].join('|');

export default {
  displayName: 'bite-tribe-business/shell',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/bite-tribe-business/shell',
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
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
