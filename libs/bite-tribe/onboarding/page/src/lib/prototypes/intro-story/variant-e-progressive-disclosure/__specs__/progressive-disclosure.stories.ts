import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ProgressiveDisclosureComponent } from '../progressive-disclosure.component';

addNecessaryIcons();

const meta: Meta<ProgressiveDisclosureComponent> = {
  title: 'Prototypes/Intro Story/E Progressive Disclosure',
  component: ProgressiveDisclosureComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Coach-mark style progressive disclosure over real BiteTribe UI in the iPhone shell. One tip at a time in a fixed teaching order — Next or auto-advance. Tip cards use Next/Back chrome; for a calmer content-first alternative without modal button stacks, see Prototypes/Intro Story/I Soft Whisper.',
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
      <ion-app style="width: 100%; height: 100%; overflow: hidden;">
        <div style="box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto; overflow: hidden; scrollbar-width: none;">
          <intro-progressive-disclosure ${argsToTemplate(args)} />
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

type Story = StoryObj<ProgressiveDisclosureComponent>;

/** Full tour across all four concept arcs. */
export const Interactive: Story = {
  args: {
    arc: 'all',
    autoAdvance: true,
    badge: 'Progressive',
  },
};

/** Find the bite — feed → filters/search → Bitemap. */
export const FindTheBite: Story = {
  name: '1 Find the bite',
  args: {
    arc: 'discover',
    autoAdvance: true,
    badge: 'Find',
  },
};

/** Share the find — Create Bite → photo → publish. */
export const ShareTheFind: Story = {
  name: '2 Share the find',
  args: {
    arc: 'share',
    autoAdvance: true,
    badge: 'Share',
  },
};

/** Join the tribe — creator → Follow. */
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
