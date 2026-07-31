import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { WhisperFlowComponent } from '../whisper-flow.component';

addNecessaryIcons();

const meta: Meta<WhisperFlowComponent> = {
  title: 'Prototypes/Intro Story/J Whisper Flow',
  component: WhisperFlowComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Soft Whisper chrome + animated real-UI gesture flows. Floating captions only — no focus boxes, blue glows, or heavy blur. Find → Share → Tribe → Go.',
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
  render: (args) => ({
    props: args,
    template: `
      <ion-app style="width: 100%; height: 100%;">
        <div style="box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-whisper-flow ${argsToTemplate(args)} />
        </div>
      </ion-app>
    `,
  }),
  argTypes: {
    arc: {
      control: 'select',
      options: ['all', 'discover', 'share', 'tribe', 'go'],
    },
  },
};

export default meta;

type Story = StoryObj<WhisperFlowComponent>;

export const Interactive: Story = {
  args: {
    arc: 'all',
    showSkip: true,
    badge: 'Whisper Flow',
  },
};

export const FindTheBite: Story = {
  name: '1 Find the bite',
  args: {
    arc: 'discover',
    showSkip: true,
    badge: 'Find',
  },
};

export const ShareTheFind: Story = {
  name: '2 Share the find',
  args: {
    arc: 'share',
    showSkip: true,
    badge: 'Share',
  },
};
