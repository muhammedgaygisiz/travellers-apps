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
    // The admin, business and creator apps keep their own Transloco
    // catalogues, and an `Admin/*`, `Business/*` or `Creator/*` story renders
    // raw keys without them. All four catalogues are named `en.json`, so they
    // cannot share `/assets/i18n/`: whichever entry is served last would win
    // the path and leave the others untranslated. Each gets its own prefix and
    // `TranslocoHttpLoader` merges them. See issues #1547 and #2130.
    {
      from: '../../../apps/bite-tribe-admin/src/assets/i18n/',
      to: '/assets/i18n-admin/',
    },
    {
      from: '../../../apps/bite-tribe-business/src/assets/i18n/',
      to: '/assets/i18n-business/',
    },
    {
      from: '../../../apps/bite-tribe-creator/src/assets/i18n/',
      to: '/assets/i18n-creator/',
    },
    // The brand characters are versioned as SSOT material rather than app
    // assets, because nothing in the product references them yet and Angular's
    // asset glob would copy the whole folder into every build regardless. See
    // Marketing - Brand Characters.
    {
      from: '../../../ssot/marketing/assets/characters/',
      to: '/assets/characters/',
    },
    // Outfit, served where each app's build copies it, so the stories render in
    // the typeface the apps bundle rather than one fetched from Google Fonts
    // (`libs/bite-tribe-common/styles/_fonts.scss`). See issue #2085.
    {
      from: '../../../libs/bite-tribe-common/assets/fonts/',
      to: '/assets/fonts/',
    },
    // The globe's country outlines, served where the app build copies them
    // (`apps/bite-tribe/project.json`). See issue #1787.
    {
      from: '../../../node_modules/world-atlas/',
      to: '/assets/world-atlas/',
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
