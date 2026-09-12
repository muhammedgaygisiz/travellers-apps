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
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { AnalyticsConsentGateComponent } from '../analytics-consent-gate.component';
import { AnalyticsConsentService } from '../../analytics/analytics-consent.service';

const TRANSLATIONS: Translation = {
  'analytics-consent-title': 'Help us improve BiteTribe',
  'analytics-consent-copy':
    'We can collect anonymous usage data to see which features work and what breaks.',
  'analytics-consent-benefit-features': 'Which screens and features get used',
  'analytics-consent-benefit-crashes': 'Crashes and errors, so we can fix them',
  'analytics-consent-benefit-never-content':
    'Never your Bites, photos or profile',
  'analytics-consent-change-later': 'You can change this any time in Settings.',
  'analytics-consent-allow': 'Allow',
  'analytics-consent-decline': 'No thanks',
};

@Injectable()
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

/**
 * The gate writes to device storage and flips the SDK flags on tap, neither of
 * which exists in a Storybook frame, so the decision is swallowed here. Without
 * it the buttons throw against a missing Capacitor plugin.
 */
class NoopConsentService {
  decide = (): Promise<void> => Promise.resolve();
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
  title: 'Components/Analytics Consent Gate',
  component: AnalyticsConsentGateComponent,
  decorators: [
    /*
     * Wrapped in `ion-app` for the same reason as the App Check gate: it is
     * rendered there in place of the router outlet, and `ion-app` hands its
     * children no height. A story outside it centres a panel the device leaves
     * top-aligned, which is what hid issue #1411.
     */
    componentWrapperDecorator((story) => `<ion-app>${story}</ion-app>`),
    moduleMetadata({
      imports: [IonApp],
      providers: [
        { provide: AnalyticsConsentService, useClass: NoopConsentService },
      ],
    }),
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
} as Meta<AnalyticsConsentGateComponent>;

type Story = StoryObj<AnalyticsConsentGateComponent>;

/** First launch: the question, before the user has answered either way. */
export const Undecided: Story = {};

/**
 * Drawn edge to edge with no `ion-header` to carry the inset, so the gate has
 * to clear the status bar and navigation bar itself. The bands mark them.
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
