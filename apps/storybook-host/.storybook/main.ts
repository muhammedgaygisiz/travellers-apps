import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/**/src/lib/**/*.stories.ts',
  ],
  addons: [],
  staticDirs: [
    {
      from: '../src/assets/',
      to: '/assets/',
    },
    {
      from: '../../../apps/bite-tribe/src/assets/',
      to: '/assets/',
    },
    // The admin and business apps keep their own Transloco catalogues, and an
    // `Admin/*` or `Business/*` story renders raw keys without them. All three
    // catalogues are named `en.json`, so they cannot share `/assets/i18n/`:
    // whichever entry is served last would win the path and leave the other two
    // apps untranslated. Each gets its own prefix and `TranslocoHttpLoader`
    // merges the three. See issue #1547.
    {
      from: '../../../apps/bite-tribe-admin/src/assets/i18n/',
      to: '/assets/i18n-admin/',
    },
    {
      from: '../../../apps/bite-tribe-business/src/assets/i18n/',
      to: '/assets/i18n-business/',
    },
    // The brand characters are versioned as SSOT material rather than app
    // assets, because nothing in the product references them yet and Angular's
    // asset glob would copy the whole folder into every build regardless. See
    // Implementation - Brand Characters.
    {
      from: '../../../ssot/assets/characters/',
      to: '/assets/characters/',
    },
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
