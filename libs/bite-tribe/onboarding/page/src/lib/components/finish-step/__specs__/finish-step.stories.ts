import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FinishStepComponent } from '../finish-step.component';

addNecessaryIcons();

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

/** People to follow under the greeting (issue #1708). */
export const WithFollowSuggestions: Story = {
  args: {
    displayName: 'Foodie',
    followSuggestions: [
      { userId: 'ana', displayName: 'Ana', biteCount: 12, reason: 'nearby' },
      { userId: 'ben', displayName: 'Ben', biteCount: 4, reason: 'curated' },
      {
        userId: 'chloe',
        displayName: 'Chloé',
        biteCount: 31,
        reason: 'active',
      },
    ],
  },
};
