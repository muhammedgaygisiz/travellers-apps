import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  {
    // `nxgraph-html` writes a compiled Storybook/Nx-graph bundle into
    // `src/assets/temp`. It is gitignored, so CI never sees it, but locally it
    // is tens of thousands of lint errors in minified output.
    //
    // Both spellings are deliberate. ESLint resolves `ignores` relative to the
    // directory of the config file that is loaded, and this project's `lint`
    // target is inferred by `@nx/eslint/plugin`, which runs `eslint .` with the
    // cwd set to the project root. The workspace-root-relative path is what
    // matches when the config is loaded from the workspace root; the short one
    // is what matches when it is loaded from `apps/storybook-host`.
    ignores: ['apps/storybook-host/src/assets/temp/**', 'src/assets/temp/**'],
  },
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
  {
    // `no-uninstalled-addons` reads a package.json to check that every addon
    // listed in `main.ts` is actually installed. It resolves the path with
    // `path.resolve`, i.e. against `process.cwd()`, and the inferred `lint`
    // target runs ESLint with the cwd set to this project root — which has no
    // package.json of its own, because dependencies live in the workspace one.
    //
    // This override is scoped here rather than in the root config because this
    // is the only project with a `.storybook/main.ts`, and the relative path
    // below is only correct from this directory.
    files: ['.storybook/main.@(js|cjs|mjs|ts)'],
    rules: {
      'storybook/no-uninstalled-addons': [
        'error',
        { packageJsonLocation: '../../package.json' },
      ],
    },
  },
];
