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
          >
            <p>Step content is rendered here by the individual step issues.</p>
          </onboarding-page>
        </div>
      </ion-app>
    `,
  }),
} as Meta<OnboardingPage>;

type Story = StoryObj<OnboardingPage>;

export const FirstStep: Story = {
  args: { currentIndex: 0, canAdvance: true },
};

export const MiddleStep: Story = {
  args: { currentIndex: 2, canAdvance: true },
};

export const LastStep: Story = {
  args: { currentIndex: ONBOARDING_STEPS.length - 1, canAdvance: true },
};

export const InvalidStep: Story = {
  args: { currentIndex: 1, canAdvance: false },
};
