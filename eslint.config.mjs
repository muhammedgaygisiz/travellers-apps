import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
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
                'smart:component',
              ],
            },
            {
              sourceTag: 'smart:component',
              onlyDependOnLibsWithTags: [
                'scope:common',
                'type:api',
                'type:model',
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
                'smart:component',
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
      '@typescript-eslint/no-extra-semi': 'error',
      'no-extra-semi': 'off',
    },
  },
  {
    files: ['*.stories.*', 'main.js'],
    extends: ['plugin:storybook/recommended'],
  },
];
