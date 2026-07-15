import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { IdentityStepComponent } from '../identity-step.component';

addNecessaryIcons();

export default {
  title: 'Pages/Onboarding/Identity Step',
  component: IdentityStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    profile: {
      userId: 'user-1',
      displayName: 'Mo',
      fullName: 'Mo',
      email: 'mo@example.com',
      photoUrl: '',
      public: false,
    },
    availability: 'idle',
  },
} as Meta<IdentityStepComponent>;

type Story = StoryObj<IdentityStepComponent>;

export const Empty: Story = {
  args: {
    profile: undefined,
    availability: 'idle',
  },
};

export const Checking: Story = {
  args: {
    availability: 'checking',
  },
};

export const Available: Story = {
  args: {
    availability: 'available',
  },
};

export const Taken: Story = {
  args: {
    availability: 'taken',
  },
};
