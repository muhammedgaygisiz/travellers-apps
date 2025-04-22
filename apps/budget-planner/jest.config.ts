const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@ionic',
  '@stencil',
  '@capacitor',
].join('|');

export default {
  displayName: 'budget-planner',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/budget-planner',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        isolatedModules: true,
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
