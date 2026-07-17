import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FinishStepComponent } from '../finish-step.component';

export default {
  title: 'Pages/Onboarding/Finish Step',
  component: FinishStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    displayName: '',
  },
} as Meta<FinishStepComponent>;

type Story = StoryObj<FinishStepComponent>;

export const Default: Story = {};

export const Personalised: Story = {
  args: {
    displayName: 'Foodie',
  },
};
