import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { PageSettings } from '../settings.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTransloco } from '@jsverse/transloco';

addNecessaryIcons();

export default {
  title: 'Pages/Settings',
  component: PageSettings,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        provideTransloco({
          config: {
            availableLangs: ['en'],
            fallbackLang: ['en'],
          },
        }),
      ],
    }),
  ],
} as Meta<PageSettings>;

type Story = StoryObj<PageSettings>;
export const Default: Story = {};
