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

export const WithPhoto: Story = {
  args: {
    profile: {
      userId: 'user-1',
      displayName: 'Mo',
      fullName: 'Mo',
      email: 'mo@example.com',
      photoUrl:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%236a5acd'/%3E%3Ccircle cx='80' cy='64' r='34' fill='%23fff'/%3E%3Crect x='30' y='104' width='100' height='60' rx='30' fill='%23fff'/%3E%3C/svg%3E",
      public: false,
    },
    availability: 'available',
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
