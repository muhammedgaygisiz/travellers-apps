module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  // Codecov collects from the workspace-root `coverage/` directory, so this
  // has to land beside every other project's report instead of inside the
  // functions folder.
  coverageDirectory: '../../../coverage/apps/bite-tribe-firebase/functions',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.dev.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
