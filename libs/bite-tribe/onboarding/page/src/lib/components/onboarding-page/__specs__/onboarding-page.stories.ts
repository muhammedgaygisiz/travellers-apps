import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { OnboardingPage } from '../onboarding.page';

addNecessaryIcons();

export default {
  title: 'Pages/Onboarding',
  component: OnboardingPage,
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
          <onboarding-page />
        </div>
      </ion-app>
    `,
  }),
} as Meta<OnboardingPage>;

type Story = StoryObj<OnboardingPage>;

export const Primary: Story = {};
