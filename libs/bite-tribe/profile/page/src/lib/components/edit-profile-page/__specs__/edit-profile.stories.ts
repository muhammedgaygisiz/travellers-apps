import { EditProfilePage } from '../edit-profile.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { APP_TITLE, getIonicConfig } from 'utils';
import { provideTransloco } from '@jsverse/transloco';

export default {
  title: 'Pages/Edit Profile',
  component: EditProfilePage,
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
} as Meta<EditProfilePage>;

type Story = StoryObj<EditProfilePage>;
export const Default: Story = {
  args: {},
};
