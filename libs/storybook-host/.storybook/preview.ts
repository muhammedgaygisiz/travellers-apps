import { componentWrapperDecorator, Preview } from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

const IPHONE = 'iphone14';

const parameters = {
  layout: 'fullscreen',
  viewport: {
    viewports: {
      [IPHONE]: INITIAL_VIEWPORTS[IPHONE],
    },
    defaultViewport: IPHONE,
  },
  options: {
    storySort: {
      order: ['Pages', 'Components', 'Tech'],
    },
  },
};

const decorators = [
  componentWrapperDecorator((story: any) => {
    setNxGraphIframeHeight();
    return story;
  }),
];

const setNxGraphIframeHeight = (): void => {
  const graphIframe = document.getElementById('storybook-root') as any;
  graphIframe.style = 'height: 100vh';
};

const preview: Preview = {
  decorators,
  parameters,
};

export default preview;
