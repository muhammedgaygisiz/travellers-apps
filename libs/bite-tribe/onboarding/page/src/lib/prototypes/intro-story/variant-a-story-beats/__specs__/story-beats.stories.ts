import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { StoryBeatsComponent } from '../story-beats.component';

addNecessaryIcons();

const meta: Meta<StoryBeatsComponent> = {
  title: 'Prototypes/Intro Story/B Real UI Story Beats',
  component: StoryBeatsComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Stories-style showcase: scaled real BiteTribe screens (non-interactive) with auto-advance + Next chrome.',
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
          <intro-story-beats />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<StoryBeatsComponent>;

export const Interactive: Story = {};
