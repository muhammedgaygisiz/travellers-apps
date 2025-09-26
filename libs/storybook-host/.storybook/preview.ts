import { componentWrapperDecorator, Preview } from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

const IPAD = 'ipad';

const parameters = {
  layout: 'fullscreen',
  viewport: {
    viewports: {
      [IPAD]: INITIAL_VIEWPORTS[IPAD],
    },
    defaultViewport: IPAD,
  },
  options: {
    storySort: {
      order: ['Pages', 'Components', 'Tech'],
    },
  },
};

const decorators = [
  componentWrapperDecorator((story) => {
    setNxGraphIframeHeight();
    return story;
  }),
];

const SUPPORTED_LANGUAGES = [
  { code: 'en', icon: '🇬🇧', title: 'English' },
  { code: 'de', icon: '🇩🇪', title: 'Deutsch' },
  { code: 'fr', icon: '🇫🇷', title: 'Français' },
  { code: 'it', icon: '🇮🇹', title: 'Italiano' },
];

const globalTypes = {
  // adds a custom dropdown menu in the Storybook UI toolbar
  language: {
    name: 'Language',
    description: `Choose a language`,
    defaultValue: 'de',
    toolbar: {
      icon: 'globe',
      items: SUPPORTED_LANGUAGES.map((language) => ({
        value: language.code,
        right: language.icon,
        title: language.title,
      })),
    },
  },
};

const setNxGraphIframeHeight = (): void => {
  const graphIframe = document.getElementById('storybook-root') as any;
  graphIframe.style = 'height: 100vh';
};

const preview: Preview = {
  decorators,
  parameters,
  globalTypes,
  tags: ['autodocs'],
};

export default preview;
