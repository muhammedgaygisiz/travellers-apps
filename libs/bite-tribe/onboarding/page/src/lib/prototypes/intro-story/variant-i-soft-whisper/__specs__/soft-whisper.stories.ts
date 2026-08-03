import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SoftWhisperComponent } from '../soft-whisper.component';

addNecessaryIcons();

const meta: Meta<SoftWhisperComponent> = {
  title: 'Prototypes/Intro Story/I Soft Whisper',
  component: SoftWhisperComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Soft Whisper — calm, content-first progressive disclosure. Light Outfit captions fade near the focal UI; gentle grayscale shine; thin progress dots; auto-advance + tap stage. At most one chrome button (Skip). No modal Next/Back stacks. Prefer this over E when the coach-mark cards feel too aggressive.',
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
          <intro-soft-whisper ${argsToTemplate(args)} />
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

type Story = StoryObj<SoftWhisperComponent>;

/** Full tour — whisper captions across every tip. */
export const Interactive: Story = {
  args: {
    arc: 'all',
    autoAdvance: true,
    showSkip: true,
    badge: 'Soft Whisper',
  },
};

/** Find the bite — feed → filters → Bitemap. */
export const FindTheBite: Story = {
  name: '1 Find the bite',
  args: {
    arc: 'discover',
    autoAdvance: true,
    showSkip: true,
    badge: 'Find',
  },
};

/** Share the find — Create → photo → publish. */
export const ShareTheFind: Story = {
  name: '2 Share the find',
  args: {
    arc: 'share',
    autoAdvance: true,
    showSkip: true,
    badge: 'Share',
  },
};

/** Join the tribe — explorer → Follow. */
export const JoinTheTribe: Story = {
  name: '3 Join the tribe',
  args: {
    arc: 'tribe',
    autoAdvance: true,
    showSkip: true,
    badge: 'Tribe',
  },
};

/** Ready to taste? — pin → drawer → Directions. */
export const ReadyToTaste: Story = {
  name: '4 Ready to taste',
  args: {
    arc: 'go',
    autoAdvance: true,
    showSkip: true,
    badge: 'Go',
  },
};
