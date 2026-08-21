import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DeleteMyAccountComponent } from '../delete-my-account.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { DeleteAccountIdentity } from 'bite-tribe/account-data-access';

addNecessaryIcons();

const passwordAccount: DeleteAccountIdentity = {
  uid: 'user-1',
  displayName: 'Mia Fernandes',
  email: 'mia@example.com',
  photoUrl: '',
  signInMethod: 'password',
};

export default {
  title: 'Pages/Delete Account',
  component: DeleteMyAccountComponent,
  args: {
    identity: passwordAccount,
  },
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

// A provider account that withholds the email still has to be identifiable.
export const AppleAccountWithoutEmail: Story = {
  args: {
    identity: {
      uid: 'user-2',
      displayName: 'Mia Fernandes',
      email: '',
      photoUrl: '',
      signInMethod: 'apple',
    },
  },
};

export const GoogleAccount: Story = {
  args: {
    identity: {
      uid: 'user-3',
      displayName: 'Mia Fernandes',
      email: 'mia@gmail.com',
      photoUrl: '',
      signInMethod: 'google',
    },
  },
};

export const SignedOut: Story = {
  args: {
    identity: null,
  },
};

export const Deleting: Story = {
  args: {
    deleting: true,
  },
};

export const Failed: Story = {
  args: {
    failed: true,
    failure: 'generic',
  },
};

export const AccountChanged: Story = {
  args: {
    failed: true,
    failure: 'account-changed',
  },
};
