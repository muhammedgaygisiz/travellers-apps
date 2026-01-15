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
