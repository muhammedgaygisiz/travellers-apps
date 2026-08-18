import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ...playwright.configs['flat/recommended'],
    files: ['**/*.ts'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      // Assertions live in the page objects (e.g. SearchPage.expectResult), so
      // register those helpers as assertions. The rule matches on the exact
      // method name (no globs), so list each page-object assertion helper here.
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expect',
            'expectResult',
            'expectBiteFields',
            'expectPositionMarkerInsideMap',
            'expectPositionSource',
            'expectPostEnabled',
          ],
        },
      ],
    },
  },
];
