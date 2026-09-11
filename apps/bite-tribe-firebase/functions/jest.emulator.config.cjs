/**
 * The emulator suite.
 *
 * `transformIgnorePatterns` carries the one non-obvious line. `firebase-admin`
 * reaches `jwks-rsa`, which imports `jose`, and jose 6 ships as ESM only - so
 * every spec that loads a module importing `firebase-functions/https` failed to
 * parse before the transform below reached into `node_modules` for that one
 * package. Nothing here verifies an ID token; the specs hand a handler its
 * decoded `request.auth` directly. The dependency is on the path regardless,
 * and it has to be loadable.
 */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.emulator-spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.dev.json',
      },
    ],
    '^.+\\.js$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          allowJs: true,
          module: 'commonjs',
          target: 'es2022',
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!jose/)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
