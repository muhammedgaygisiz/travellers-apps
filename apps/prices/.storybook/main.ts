import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../../../libs/prices/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/common/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/prices/**/__specs__/**/*.mdx',
  ],
  addons: ['@storybook/addon-essentials', '@storybook/addon-mdx-gfm'],
  features: {
    previewMdx2: true,
  },
  staticDirs: [
    {
      from: '../src/assets/i18n',
      to: '/assets/i18n',
    },
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
