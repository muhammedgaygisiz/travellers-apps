import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RealUiSourceComponent } from '../../source-real-ui/real-ui-source.component';
import { JOIN_THE_TRIBE_FLOWS } from '../tribe-go-flows';

addNecessaryIcons();

const meta: Meta<RealUiSourceComponent> = {
  title: 'Prototypes/Intro Story/Flows/Join the tribe',
  component: RealUiSourceComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Intentional Join-the-tribe story flows — real UI + SyncedGestureController. Each story is one recognizable intention.',
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
          <intro-real-ui-source ${argsToTemplate(args)} />
        </div>
      </ion-app>
    `,
  }),
};

export default meta;

type Story = StoryObj<RealUiSourceComponent>;

const flowStory = (flowId: string, title: string, caption: string): Story => ({
  name: title,
  args: {
    beat: 'tribe',
    framed: true,
    badge: 'Tribe · Flow',
    flowId,
    caption,
    simulate: true,
  },
});

export const DetailsCreatorFollow: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[0].id,
  JOIN_THE_TRIBE_FLOWS[0].title,
  JOIN_THE_TRIBE_FLOWS[0].caption,
);

export const FollowThenOpenBitesGrid: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[1].id,
  JOIN_THE_TRIBE_FLOWS[1].title,
  JOIN_THE_TRIBE_FLOWS[1].caption,
);

export const UnfollowThenRefollow: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[2].id,
  JOIN_THE_TRIBE_FLOWS[2].title,
  JOIN_THE_TRIBE_FLOWS[2].caption,
);

export const FollowFromDetailsShortcut: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[3].id,
  JOIN_THE_TRIBE_FLOWS[3].title,
  JOIN_THE_TRIBE_FLOWS[3].caption,
);

export const BucketListSaveThenFollow: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[4].id,
  JOIN_THE_TRIBE_FLOWS[4].title,
  JOIN_THE_TRIBE_FLOWS[4].caption,
);

export const FollowFollowerCountBump: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[5].id,
  JOIN_THE_TRIBE_FLOWS[5].title,
  JOIN_THE_TRIBE_FLOWS[5].caption,
);

export const MenuLeaderboardThenFollow: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[6].id,
  JOIN_THE_TRIBE_FLOWS[6].title,
  JOIN_THE_TRIBE_FLOWS[6].caption,
);

export const FollowTwoCreators: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[7].id,
  JOIN_THE_TRIBE_FLOWS[7].title,
  JOIN_THE_TRIBE_FLOWS[7].caption,
);

export const PublicPrivateTipThenFollow: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[8].id,
  JOIN_THE_TRIBE_FLOWS[8].title,
  JOIN_THE_TRIBE_FLOWS[8].caption,
);

export const FollowThenLeaderboardPeek: Story = flowStory(
  JOIN_THE_TRIBE_FLOWS[9].id,
  JOIN_THE_TRIBE_FLOWS[9].title,
  JOIN_THE_TRIBE_FLOWS[9].caption,
);
