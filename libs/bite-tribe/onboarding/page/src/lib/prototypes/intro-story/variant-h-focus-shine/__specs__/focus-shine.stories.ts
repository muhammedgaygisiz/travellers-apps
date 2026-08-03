import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { FocusShineComponent } from '../focus-shine.component';

addNecessaryIcons();

const meta: Meta<FocusShineComponent> = {
  title: 'Prototypes/Intro Story/H Focus Shine',
  component: FocusShineComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Focus Shine — irrelevant UI fades and grayscales; the current focal control stays full color with a soft glow. Short tip narration nearby. Find → Share → Tribe → Go on real BiteTribe UI.',
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
          <intro-focus-shine ${argsToTemplate(args)} />
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

type Story = StoryObj<FocusShineComponent>;

/** Full tour — morphing shine hole across every tip. */
export const Interactive: Story = {
  args: {
    arc: 'all',
    autoAdvance: true,
    badge: 'Focus Shine',
  },
};

/** Find the bite — feed → filters → Bitemap. */
export const FindTheBite: Story = {
  name: '1 Find the bite',
  args: {
    arc: 'discover',
    autoAdvance: true,
    badge: 'Find',
  },
};

/** Share the find — Create → photo → publish. */
export const ShareTheFind: Story = {
  name: '2 Share the find',
  args: {
    arc: 'share',
    autoAdvance: true,
    badge: 'Share',
  },
};

/** Join the tribe — explorer → Follow. */
export const JoinTheTribe: Story = {
  name: '3 Join the tribe',
  args: {
    arc: 'tribe',
    autoAdvance: true,
    badge: 'Tribe',
  },
};

/** Ready to taste? — pin → drawer → Directions. */
export const ReadyToTaste: Story = {
  name: '4 Ready to taste',
  args: {
    arc: 'go',
    autoAdvance: true,
    badge: 'Go',
  },
};
