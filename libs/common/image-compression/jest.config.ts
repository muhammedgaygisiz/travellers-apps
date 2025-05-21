export default {
  displayName: 'image-compression',
  preset: '../../../jest.preset.js',
  testEnvironment: 'jsdom', // Use jsdom test environment
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }], // Match only `.ts` files
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/common/image-compression',
};
