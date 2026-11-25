import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { getIonicConfig } from 'utils';
import { DietaryChoicesComponent } from '../dietary-choices.component';

addIcons({ checkmarkOutline });

/** The settings section for a member's dietary choices (GitHub issue #2196). */
export default {
  title: 'Components/Dietary Choices',
  component: DietaryChoicesComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<DietaryChoicesComponent>;

type Story = StoryObj<DietaryChoicesComponent>;

/** Nothing set yet, and no consent: the religion and health hint shows. */
export const Empty: Story = {
  args: { choices: [], consentGiven: false },
};

/** Lifestyle choices need no consent. */
export const Lifestyle: Story = {
  args: { choices: ['vegan', 'alcohol-free'], consentGiven: false },
};

/** Consent given: sensitive choices are set and the consent can be withdrawn. */
export const WithConsent: Story = {
  args: {
    choices: ['vegetarian', 'halal', 'avoids-alcohol'],
    consentGiven: true,
  },
};
