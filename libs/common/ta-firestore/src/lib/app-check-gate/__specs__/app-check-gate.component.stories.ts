import {
  applicationConfig,
  componentWrapperDecorator,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { Injectable, signal } from '@angular/core';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { AppCheckGateComponent } from '../app-check-gate.component';
import { AppCheckReadinessService } from '../../app-check-readiness.service';

const TRANSLATIONS: Translation = {
  'app-check-blocked-title': "Couldn't load the app",
  'app-check-blocked-message': 'Check your connection and try again.',
  'app-check-retry': 'Try again',
  loading: 'Loading',
};

@Injectable()
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

/** The wait is running: the bounded recovery, or a re-check after a tap. */
class WaitingReadinessService {
  readonly status = signal('blocked').asReadonly();
  readonly isRetrying = signal(false).asReadonly();
  retry = (): Promise<void> => Promise.resolve();
}

/** The wait ended without a token. */
class UnavailableReadinessService {
  readonly status = signal('unavailable').asReadonly();
  readonly isRetrying = signal(false).asReadonly();
  retry = (): Promise<void> => Promise.resolve();
}

const withReadiness = (
  useClass: typeof WaitingReadinessService | typeof UnavailableReadinessService,
): ReturnType<typeof moduleMetadata> =>
  moduleMetadata({
    providers: [{ provide: AppCheckReadinessService, useClass }],
  });

const SAFE_AREA_TOP = '35px';
const SAFE_AREA_BOTTOM = '24px';

/**
 * Paints the two system bars the platform insets stand for, so a reference
 * image shows whether the panel clears them instead of only where it sits.
 */
const systemBar = (edge: 'top' | 'bottom', height: string): string => `
  <div style="
    position: absolute;
    left: 0;
    right: 0;
    ${edge}: 0;
    height: ${height};
    background: rgba(217, 48, 37, 0.25);
    z-index: 10;
  "></div>`;

export default {
  title: 'Components/App Check Gate',
  component: AppCheckGateComponent,
  decorators: [
    /*
     * The gate is rendered inside `ion-app` in place of the router outlet, and
     * `ion-app` carries `.ion-page` — a flex column that hands its children no
     * height. Storybook's own root does have one, so a story rendered outside
     * `ion-app` centred the panel that the device left top-aligned. That is
     * what hid issue #1411.
     */
    componentWrapperDecorator((story) => `<ion-app>${story}</ion-app>`),
    moduleMetadata({ imports: [IonApp] }),
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          loader: StoryTranslocoLoader,
        }),
      ],
    }),
  ],
} as Meta<AppCheckGateComponent>;

type Story = StoryObj<AppCheckGateComponent>;

/**
 * What a blocked start looks like for as long as the app is still trying: the
 * logo and a spinner, with no copy and nothing to tap (issue #1465).
 */
export const Loading: Story = {
  decorators: [withReadiness(WaitingReadinessService)],
};

/**
 * The end of the wait: a message any failed load would use, and a retry. It
 * does not mention the security check.
 */
export const Unavailable: Story = {
  decorators: [withReadiness(UnavailableReadinessService)],
};

/**
 * On a device the gate is drawn edge to edge with no `ion-header` to carry the
 * inset, so it has to keep itself clear of the status bar and the navigation
 * bar on its own. The bands mark where those bars are.
 */
export const WithSystemBarInsets: Story = {
  decorators: [
    withReadiness(UnavailableReadinessService),
    componentWrapperDecorator(
      (story) => `
        <div style="
          --ion-safe-area-top: ${SAFE_AREA_TOP};
          --ion-safe-area-bottom: ${SAFE_AREA_BOTTOM};
        ">
          ${story}
          ${systemBar('top', SAFE_AREA_TOP)}
          ${systemBar('bottom', SAFE_AREA_BOTTOM)}
        </div>`,
    ),
  ],
};
