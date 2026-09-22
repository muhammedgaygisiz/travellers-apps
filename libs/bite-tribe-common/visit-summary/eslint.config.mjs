import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    // The selector prefix rules the generator writes are dropped rather than
    // obeyed, following every other library here: this workspace names
    // components `bt-*`, and renaming one library's selectors to `lib-*` to
    // satisfy a generated default would be the odd one out.
    rules: {},
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
];
