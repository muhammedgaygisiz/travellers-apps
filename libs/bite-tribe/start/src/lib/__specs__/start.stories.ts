import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, StoryObj } from '@storybook/angular';
import { StartComponent } from '../start.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

addNecessaryIcons();

export default {
  title: 'Pages/Start',
  component: StartComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            fallbackLang: ['en'],
          },
        }),
      ],
    }),
  ],
};

type Story = StoryObj<StartComponent>;
export const Primary: Story = {};
