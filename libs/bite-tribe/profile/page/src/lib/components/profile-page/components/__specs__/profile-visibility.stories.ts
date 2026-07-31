import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ProfileVisibility } from '../profile-visibility';

addNecessaryIcons();

export default {
  title: 'Pages/Profile/Visibility',
  component: ProfileVisibility,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<ProfileVisibility>;

type Story = StoryObj<ProfileVisibility>;

export const PublicProfile: Story = {
  args: {
    isPublic: true,
  },
};

export const PrivateProfile: Story = {
  args: {
    isPublic: false,
  },
};

// A profile saved before the visibility choice existed carries no `public`
// field at all, and it has to read as private rather than as an empty state.
export const WithoutSavedChoice: Story = {
  args: {
    isPublic: undefined,
  },
};
