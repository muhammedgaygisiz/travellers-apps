import { INITIAL_VIEWPORTS } from 'storybook/viewport';

const preview = {
  parameters: {
    layout: 'fullscreen',
    viewport: {
      viewports: INITIAL_VIEWPORTS,
      defaultViewport: 'iphonese2',
    },
  },

  tags: ['autodocs'],
};

export default preview;
