import type { StorybookConfig } from '@storybook/angular';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  stories: [
    '../../../libs/prices/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/common/**/__specs__/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/prices/**/__specs__/**/*.mdx',
  ],

  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
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
