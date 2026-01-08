// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { StorybookConfig } from '@storybook/angular';

// eslint-disable-next-line @nx/enforce-module-boundaries
import rootMain from '../../../.storybook/main';

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  ...rootMain,
  core: {
    ...rootMain.core,
    builder: getAbsolutePath("@storybook/builder-webpack5"),
  },
  stories: [
    '../../../apps/bite-tribe/src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../apps/bite-tribe-business/src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
    '../../../libs/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
  ],
  addons: [getAbsolutePath('@chromatic-com/storybook')],
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
  env: (config): any => ({
    ...config,
  }),
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
