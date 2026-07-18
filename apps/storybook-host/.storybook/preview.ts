import {
  applicationConfig,
  componentWrapperDecorator,
  Decorator,
  Preview,
  StoryFn,
} from '@storybook/angular';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

const LOCALE_STORAGE_KEY = 'storybook-active-locale';

const IPHONE = 'iphone14';

const SUPPORTED_LOCALES = [
  { value: 'en', title: 'English' },
  { value: 'de', title: 'German' },
  { value: 'fr', title: 'French' },
  { value: 'tr', title: 'Turkish' },
  { value: 'es', title: 'Spanish' },
  { value: 'it', title: 'Italian' },
  { value: 'ar', title: 'Arabic' },
  { value: 'am', title: 'Amharic' },
  { value: 'id', title: 'Indonesian' },
  { value: 'pt', title: 'Portuguese' },
  { value: 'th', title: 'Thai' },
];

const withLocale: Decorator = (storyFn, context): ReturnType<StoryFn> => {
  const locale = (context.globals['locale'] as string) || 'en';
  const previousLocale = sessionStorage.getItem(LOCALE_STORAGE_KEY);

  if (previousLocale !== null && previousLocale !== locale) {
    sessionStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.location.reload();
  } else {
    sessionStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  return applicationConfig({
    providers: [
      provideHttpClient(),
      provideTransloco({
        config: {
          availableLangs: SUPPORTED_LOCALES.map((l) => l.value),
          defaultLang: (context.globals['locale'] as string) || 'en',
          fallbackLang: 'en',
        },
        loader: TranslocoHttpLoader,
      }),
    ],
  })(storyFn, context);
};

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
  withLocale,
  componentWrapperDecorator((story) => {
    setNxGraphIframeHeight();
    return story;
  }),
];

const setNxGraphIframeHeight = (): void => {
  const storybookRoot = document.getElementById('storybook-root');

  if (storybookRoot) {
    storybookRoot.style.height = '100vh';
  }
};

const preview: Preview = {
  decorators,
  parameters,
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      toolbar: {
        icon: 'globe',
        items: SUPPORTED_LOCALES,
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: 'en',
  },
};

export default preview;
