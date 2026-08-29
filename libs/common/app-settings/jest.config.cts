module.exports = {
  displayName: 'app-settings',
  preset: '../../../jest.preset.js',
  // The shared preset's setup touches `window`, so the node environment cannot
  // run a suite here. Matches every other lib in the workspace.
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/common/app-settings',
};
