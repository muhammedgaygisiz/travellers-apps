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
import {
  TILE_LAYER_FACTORY,
  createBlankTileLayer,
  createOpenstreetmapLayer,
} from 'bite-tribe-common/map';
import { TranslocoHttpLoader } from './transloco-loader';
// Re-exposes the story-store API that direct oblador/loki needs on Storybook 10.
import { registerLokiSettle } from './loki-getstories-shim';

const LOCALE_STORAGE_KEY = 'storybook-active-locale';

// Loki sets `window.loki.isRunning` before the story loads (see
// @loki/target-chrome-core). Under Loki the map must render a deterministic
// blank tile layer instead of live OpenStreetMap tiles, which are blocked/flaky
// and non-deterministic in the docker Chrome. Manual Storybook keeps real tiles.
type LokiWindow = Window & { loki?: { isRunning?: boolean } };

const isRunningUnderLoki = (): boolean =>
  Boolean((window as LokiWindow).loki?.isRunning);

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
      {
        provide: TILE_LAYER_FACTORY,
        useValue: () =>
          isRunningUnderLoki()
            ? createBlankTileLayer()
            : createOpenstreetmapLayer(),
      },
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
      order: ['Prototypes', 'Pages', 'Components', 'Tech'],
    },
  },
};

// Registered per story render so Loki waits for deferred content (Angular
// `@defer` with a `@placeholder (minimum ...)`) and images before capturing.
const withLokiSettle: Decorator = (storyFn, context): ReturnType<StoryFn> => {
  registerLokiSettle();
  return storyFn(context);
};

const decorators = [
  withLokiSettle,
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
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: 'en',
  },
};

export default preview;
