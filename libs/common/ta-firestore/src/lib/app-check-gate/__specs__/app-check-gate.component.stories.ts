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
  'app-check-blocked-title': 'Extra security check needed',
  'app-check-blocked-message':
    'BiteTribe could not verify this device with its security check. Check your connection and try again to continue.',
  'app-check-retry': 'Try again',
};

@Injectable()
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

class RetryingReadinessService {
  readonly isRetrying = signal(true).asReadonly();
  retry = (): Promise<void> => Promise.resolve();
}

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

/** Default state: waiting for the user to retry the App Check verification. */
export const Idle: Story = {};

/** Retry in progress: the button is disabled and shows a spinner. */
export const Retrying: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: AppCheckReadinessService,
          useClass: RetryingReadinessService,
        },
      ],
    }),
  ],
};

/**
 * On a device the gate is drawn edge to edge with no `ion-header` to carry the
 * inset, so it has to keep itself clear of the status bar and the navigation
 * bar on its own. The bands mark where those bars are.
 */
export const WithSystemBarInsets: Story = {
  decorators: [
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
