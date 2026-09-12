/*
 * The packages that have to be transformed rather than skipped.
 *
 * The offline queue reaches `ta-firestore` for the signed-in account
 * (issue #1096), and that barrel pulls Ionic in behind it - which ships
 * untranspiled ES modules Jest cannot parse. The sibling page library and
 * `onboarding-data-access` carry the same list for the same reason.
 */
const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@stencil',
  '@capacitor',
  '@jsverse',
].join('|');

export default {
  displayName: 'bite-tribe-business/table-management-data-access',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory:
    '../../../../coverage/libs/bite-tribe-business/table-management/data-access',
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
