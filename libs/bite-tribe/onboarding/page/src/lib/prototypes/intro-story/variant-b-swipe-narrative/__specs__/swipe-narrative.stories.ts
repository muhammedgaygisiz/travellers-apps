import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SwipeNarrativeComponent } from '../swipe-narrative.component';

addNecessaryIcons();

const meta: Meta<SwipeNarrativeComponent> = {
  title: 'Prototypes/Intro Story/C Real UI Swipe',
  component: SwipeNarrativeComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Swipe / Continue showcase of scaled real BiteTribe screens (non-interactive UI; chrome advances).',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
  render: () => ({
    template: `
      <ion-app style="width: 100%; height: 100%;">
        <div style="box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-swipe-narrative />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<SwipeNarrativeComponent>;

export const Interactive: Story = {};
