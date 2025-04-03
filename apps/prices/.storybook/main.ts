import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: [
    '../../../libs/prices/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/common/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/prices/**/__specs__/**/*.mdx',
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-mdx-gfm',
    '@chromatic-com/storybook',
  ],
  staticDirs: [
    {
      from: '../src/assets/i18n',
      to: '/assets/i18n',
    },
  ],

  framework: '@storybook/angular',

  docs: {},
};

export default config;
