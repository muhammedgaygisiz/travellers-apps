import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FakeUiSimComponent } from '../fake-ui-sim.component';
import type { IntroStorySceneId } from '../../../intro-story.model';

addNecessaryIcons();

const meta: Meta<FakeUiSimComponent> = {
  title: 'Prototypes/Intro Story/_Archive/Fake UI Sim',
  component: FakeUiSimComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'ARCHIVED — Remotion-style fake UI mockups. Not the primary intro demo; use B/C/D Real UI instead.',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="width: 100%; height: 100vh; max-width: 430px; margin: 0 auto;">
          <intro-fake-ui-sim ${argsToTemplate(args)} />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<FakeUiSimComponent>;

const beat = (id: IntroStorySceneId): Story => ({ args: { beat: id } });

export const DiscoverFeedScroll: Story = beat('discover');
export const ShareCreateFlow: Story = beat('share');
export const TribeDetailsActions: Story = beat('tribe');
export const GoMapPins: Story = beat('go');
