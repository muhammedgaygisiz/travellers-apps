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

/**
 * The three viewports the app is reviewed at.
 *
 * These drive manual Storybook browsing only. Loki emulates its own devices
 * through `configurations` in `loki.config.js`, so changing this list does not
 * move any visual-regression baseline.
 */
const DESKTOP = 'desktop';
const IPHONE_12_MINI = 'iphone12mini';
const GALAXY_A5 = 'galaxyA5';

/**
 * 1440px is the width the desktop content column is capped at, so this shows
 * the widest layout the app will ever produce — past it the page only adds
 * gutters. See GitHub issue #1250.
 */
const DESKTOP_VIEWPORT = {
  name: 'Desktop',
  styles: { width: '1440px', height: '900px' },
  type: 'desktop',
} as const;

/**
 * Storybook ships no Samsung preset beyond the Galaxy S5/S9. Every Galaxy A5
 * generation reports the same 360x640 CSS pixels — 720x1280 at 2x on the 2015
 * model, 1080x1920 at 3x on the 2016 and 2017 ones — so the density does not
 * change the layout box.
 */
const GALAXY_A5_VIEWPORT = {
  name: 'Samsung Galaxy A5',
  styles: { width: '360px', height: '640px' },
  type: 'mobile',
} as const;

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
    options: {
      [DESKTOP]: DESKTOP_VIEWPORT,
      [IPHONE_12_MINI]: INITIAL_VIEWPORTS[IPHONE_12_MINI],
      [GALAXY_A5]: GALAXY_A5_VIEWPORT,
    },
  },
  options: {
    storySort: {
      order: ['Pages', 'Components', 'Tech'],
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
    /**
     * Storybook 10 takes the starting viewport from globals. The older
     * `parameters.viewport.defaultViewport` is ignored, which is why the
     * toolbar used to open on the built-in "Small mobile" instead of the
     * configured device.
     *
     * Most components are still designed phone-first, so stories open at a
     * phone width.
     */
    viewport: { value: IPHONE_12_MINI },
  },
};

export default preview;
