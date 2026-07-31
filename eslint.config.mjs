import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      // Dev-only Remotion package — not an Nx project; linted via its own tooling.
      'tools/intro-story-remotion/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // Build-time esbuild plugin shared by both app builds. It runs in
            // Node before bundling and never ends up in an app bundle.
            '^.*/tools/env-var-plugin$',
          ],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:shell', 'scope:common'],
            },
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:store',
                'scope:common',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:model',
                'type:store',
                'scope:common',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:store',
                'scope:common',
                'type:api',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:store',
              onlyDependOnLibsWithTags: [
                'scope:common',
                'type:api',
                'type:model',
              ],
            },
            {
              sourceTag: 'scope:common',
              onlyDependOnLibsWithTags: ['scope:common'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'scope:common',
                'type:model',
              ],
            },
            {
              sourceTag: 'scope:bite-tribe',
              onlyDependOnLibsWithTags: [
                'scope:bite-tribe',
                'scope:common',
                'type:ui',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
  {
    files: ['*.js', '*.jsx'],
    extends: ['plugin:@nx/javascript'],
    rules: {
      'no-extra-semi': 'off',
    },
  },
  {
    files: ['*.stories.*', 'main.js'],
    extends: ['plugin:storybook/recommended'],
  },
];
