import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DeleteMyAccountComponent } from '../delete-my-account.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Delete Account',
  component: DeleteMyAccountComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<DeleteMyAccountComponent>;

type Story = StoryObj<DeleteMyAccountComponent>;

export const Default: Story = {};

export const Deleting: Story = {
  args: {
    deleting: true,
  } as Partial<DeleteMyAccountComponent>,
};

export const Failed: Story = {
  args: {
    failed: true,
  } as Partial<DeleteMyAccountComponent>,
};
