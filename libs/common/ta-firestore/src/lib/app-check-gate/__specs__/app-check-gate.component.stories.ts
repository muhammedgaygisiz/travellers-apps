import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
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
    'Bite Tribe could not verify this device with its security check. Check your connection and try again to continue.',
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

export default {
  title: 'Components/App Check Gate',
  component: AppCheckGateComponent,
  decorators: [
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
