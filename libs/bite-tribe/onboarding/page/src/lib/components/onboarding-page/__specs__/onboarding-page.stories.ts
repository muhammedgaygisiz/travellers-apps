import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { OnboardingPage } from '../onboarding.page';
import { ONBOARDING_STEPS } from '../../../steps/onboarding-steps';

addNecessaryIcons();

export default {
  title: 'Pages/Onboarding',
  component: OnboardingPage,
  args: {
    steps: ONBOARDING_STEPS,
    currentIndex: 0,
    canAdvance: false,
    isCurrentStepValid: false,
    profile: {
      userId: 'storybook-user',
      displayName: 'Mo',
      fullName: 'Mo',
      email: 'mo@example.com',
      photoUrl: '',
      public: false,
    },
    displayNameAvailability: 'idle',
    selectedVisibility: false,
  },
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="height: 100vh">
          <onboarding-page
            [steps]="steps"
            [currentIndex]="currentIndex"
            [canAdvance]="canAdvance"
            [isCurrentStepValid]="isCurrentStepValid"
            [profile]="profile"
            [displayNameAvailability]="displayNameAvailability"
            [selectedVisibility]="selectedVisibility"
          />
        </div>
      </ion-app>
    `,
  }),
} as Meta<OnboardingPage>;

type Story = StoryObj<OnboardingPage>;

export const FirstStep: Story = {
  args: {
    currentIndex: 0,
    canAdvance: true,
    displayNameAvailability: 'available',
  },
};

export const FirstStepNameTaken: Story = {
  args: {
    currentIndex: 0,
    canAdvance: false,
    displayNameAvailability: 'taken',
  },
};

/**
 * Arrival state: private is preselected and that default already counts as the
 * answer, so Next is enabled without touching an option (issue #1326).
 */
export const VisibilityStep: Story = {
  args: {
    currentIndex: 1,
    canAdvance: true,
    selectedVisibility: false,
  },
};

export const VisibilityPublicSelected: Story = {
  args: {
    currentIndex: 1,
    canAdvance: true,
    selectedVisibility: true,
  },
};

export const MiddleStep: Story = {
  args: {
    currentIndex: 2,
    canAdvance: true,
    isCurrentStepValid: true,
  },
};

export const LastStep: Story = {
  args: {
    currentIndex: ONBOARDING_STEPS.length - 1,
    canAdvance: true,
    isCurrentStepValid: true,
  },
};

export const InvalidStep: Story = {
  args: {
    currentIndex: 2,
    canAdvance: false,
    isCurrentStepValid: false,
  },
};
