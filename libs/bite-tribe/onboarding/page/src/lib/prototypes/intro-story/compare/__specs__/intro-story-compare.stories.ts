import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { IntroStoryCompareComponent } from '../intro-story-compare.component';

addNecessaryIcons();

const meta: Meta<IntroStoryCompareComponent> = {
  title: 'Prototypes/Intro Story/Compare',
  component: IntroStoryCompareComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Flip A Icons-only vs B/C/D scaled real-UI showcases (Home, Create Bite, Details, Profile, Bitemap). Soft-dot replay — not video.',
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
      <ion-app>
        <div style="width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-story-compare />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<IntroStoryCompareComponent>;

export const Interactive: Story = {};
