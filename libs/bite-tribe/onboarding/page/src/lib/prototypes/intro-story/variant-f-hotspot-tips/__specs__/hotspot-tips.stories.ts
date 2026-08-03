import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { HotspotTipsComponent } from '../hotspot-tips.component';

addNecessaryIcons();

const frameStyle =
  'box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto; overflow: hidden; scrollbar-width: none;';

const meta: Meta<HotspotTipsComponent> = {
  title: 'Prototypes/Intro Story/F Hotspot Tips',
  component: HotspotTipsComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Pulsing hotspot anchors over real BiteTribe UI. Compact tip pill or bottom sheet near the focused hotspot — soft premium motion.',
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
        <div style="${frameStyle}">
          <intro-hotspot-tips ${argsToTemplate(args)} />
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

type Story = StoryObj<HotspotTipsComponent>;

export const Interactive: Story = {
  args: {
    arc: 'all',
    autoAdvance: true,
    badge: 'Hotspots',
  },
};

export const FindTheBite: Story = {
  name: '1 Find the bite',
  args: {
    arc: 'discover',
    autoAdvance: true,
    badge: 'Find',
  },
};

export const ShareTheFind: Story = {
  name: '2 Share the find',
  args: {
    arc: 'share',
    autoAdvance: true,
    badge: 'Share',
  },
};

export const JoinTheTribe: Story = {
  name: '3 Join the tribe',
  args: {
    arc: 'tribe',
    autoAdvance: true,
    badge: 'Tribe',
  },
};

export const ReadyToTaste: Story = {
  name: '4 Ready to taste',
  args: {
    arc: 'go',
    autoAdvance: true,
    badge: 'Go',
  },
};
