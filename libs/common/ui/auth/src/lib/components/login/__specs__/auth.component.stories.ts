import { LoginComponent } from '../login.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTransloco } from '@jsverse/transloco';

addNecessaryIcons();

export default {
  title: 'Pages/Login',
  component: LoginComponent,
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
} as Meta<LoginComponent>;

type Story = StoryObj<LoginComponent>;
export const Primary: Story = {};
