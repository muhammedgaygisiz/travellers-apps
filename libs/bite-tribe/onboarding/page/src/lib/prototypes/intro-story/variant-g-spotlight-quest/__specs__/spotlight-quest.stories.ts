import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SpotlightQuestComponent } from '../spotlight-quest.component';

addNecessaryIcons();

const frameStyle =
  'box-sizing: border-box; width: 100%; height: 100vh; max-width: 430px; margin: 0 auto; overflow: hidden; scrollbar-width: none;';

const meta: Meta<SpotlightQuestComponent> = {
  title: 'Prototypes/Intro Story/G Spotlight Quest',
  component: SpotlightQuestComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Guided quest with persistent Discover · Share · Tribe · Go checklist, vignette spotlight, and check-off micro-animation over real UI.',
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
          <intro-spotlight-quest ${argsToTemplate(args)} />
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

type Story = StoryObj<SpotlightQuestComponent>;

export const Interactive: Story = {
  args: {
    arc: 'all',
    autoAdvance: true,
    badge: 'Quest',
  },
};

export const FindTheBite: Story = {
  name: '1 Discover',
  args: {
    arc: 'discover',
    autoAdvance: true,
    badge: 'Quest',
  },
};

export const ShareTheFind: Story = {
  name: '2 Share',
  args: {
    arc: 'share',
    autoAdvance: true,
    badge: 'Quest',
  },
};

export const JoinTheTribe: Story = {
  name: '3 Tribe',
  args: {
    arc: 'tribe',
    autoAdvance: true,
    badge: 'Quest',
  },
};

export const ReadyToTaste: Story = {
  name: '4 Go',
  args: {
    arc: 'go',
    autoAdvance: true,
    badge: 'Quest',
  },
};
