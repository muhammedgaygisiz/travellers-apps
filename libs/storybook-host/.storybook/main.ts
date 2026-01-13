import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../../../apps/bite-tribe/src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../apps/bite-tribe-business/src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
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
  env: (config: any): any => ({
    ...config,
  }),
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
