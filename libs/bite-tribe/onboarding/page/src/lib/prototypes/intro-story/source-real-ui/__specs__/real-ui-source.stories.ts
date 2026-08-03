import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RealUiSourceComponent } from '../real-ui-source.component';
import type { IntroStorySceneId } from '../../intro-story.model';

addNecessaryIcons();

const meta: Meta<RealUiSourceComponent> = {
  title: 'Prototypes/Intro Story/B Real UI Story Beats/Beats',
  component: RealUiSourceComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Single-beat scaled showcase of real pages (Home, Create Bite, Details, Profile, Bitemap). Soft-dot gesture replay — not video.',
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
          <intro-real-ui-source ${argsToTemplate(args)} />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<RealUiSourceComponent>;

const beat = (id: IntroStorySceneId): Story => ({
  args: {
    beat: id,
    framed: true,
    badge: 'Real UI',
  },
});

export const DiscoverHomeFeed: Story = beat('discover');
export const ShareCreateBite: Story = beat('share');
export const TribeFollowExplorer: Story = beat('tribe');
export const GoFindNearby: Story = beat('go');
