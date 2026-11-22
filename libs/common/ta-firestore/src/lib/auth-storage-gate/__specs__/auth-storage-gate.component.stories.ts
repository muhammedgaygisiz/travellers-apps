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
import { AuthStorageGateComponent } from '../auth-storage-gate.component';

const TRANSLATIONS: Translation = {
  'auth-storage-stuck-title': "Your browser's storage isn't responding",
  'auth-storage-stuck-message':
    "Another BiteTribe tab may be holding it. Close your other BiteTribe tabs and reload. If that doesn't help, clear this site's data in your browser settings.",
  'auth-storage-stuck-reload': 'Reload',
};

@Injectable()
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

export default {
  title: 'Components/Auth Storage Gate',
  component: AuthStorageGateComponent,
  decorators: [
    // Inside `ion-app`, where the apps render it in place of the router
    // outlet; see the App Check gate's stories for why that matters.
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
} as Meta<AuthStorageGateComponent>;

type Story = StoryObj<AuthStorageGateComponent>;

/**
 * What a web app shows while the browser's storage for the session does not
 * answer (GitHub issue #2253): what is wrong, what to do, and a reload.
 */
export const Stuck: Story = {};
