import { EditProfilePage } from '../edit-profile.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { APP_TITLE, getIonicConfig } from 'utils';
import type { PublicUser } from 'model';

const unverifiedUser: PublicUser = {
  userId: 'user-1',
  displayName: 'Traveller',
  email: 'traveller@example.com',
  photoUrl: '',
  public: true,
  emailVerified: false,
};

export default {
  title: 'Pages/Edit Profile',
  component: EditProfilePage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<EditProfilePage>;

type Story = StoryObj<EditProfilePage>;
export const Default: Story = {
  args: {},
};

/** The account still has to verify its email, so the resend offer is idle. */
export const EmailVerificationPrompt: Story = {
  args: {
    publicUser: unverifiedUser,
    showEmailVerificationPrompt: true,
  },
};

/** The resend callable is in flight: progress is shown and the tap is blocked. */
export const EmailVerificationResendRunning: Story = {
  args: {
    publicUser: unverifiedUser,
    showEmailVerificationPrompt: true,
    emailVerificationResendRunning: true,
  },
};
