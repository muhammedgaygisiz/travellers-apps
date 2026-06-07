import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SearchPage } from '../search.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Search',
  component: SearchPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<SearchPage>;

type Story = StoryObj<SearchPage>;
export const Default: Story = {};
