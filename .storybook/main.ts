export default {
  core: {},

  framework: {
    name: '@storybook/angular',
    options: {},
  },

  webpackFinal: undefined,
  addons: ['@chromatic-com/storybook'],

  docs: {
    defaultName: 'Documentation',
  },
};

// uncomment the property below if you want to apply some webpack config globally
// webpackFinal: async (config, { configType }) => {
//   // Make whatever fine-grained changes you need that should apply to all storybook configs
//   // Return the altered config
//   return config;
// },
