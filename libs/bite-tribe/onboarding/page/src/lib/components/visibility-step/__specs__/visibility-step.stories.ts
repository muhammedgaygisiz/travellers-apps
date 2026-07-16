import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { VisibilityStepComponent } from '../visibility-step.component';

export default {
  title: 'Pages/Onboarding/Visibility Step',
  component: VisibilityStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    selectedPublic: false,
  },
} as Meta<VisibilityStepComponent>;

type Story = StoryObj<VisibilityStepComponent>;

export const PrivatePreselected: Story = {};

export const PublicSelected: Story = {
  args: {
    selectedPublic: true,
  },
};
