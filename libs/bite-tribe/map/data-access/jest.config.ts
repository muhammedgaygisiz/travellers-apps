const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@stencil',
  '@capacitor',
  '@jsverse',
].join('|');

export default {
  displayName: 'bite-tribe/map-data-access',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../../coverage/libs/bite-tribe/map/data-access',
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
