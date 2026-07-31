import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RealUiSourceComponent } from '../../source-real-ui/real-ui-source.component';
import { SHARE_THE_FIND_FLOWS } from '../flow-scripts';

addNecessaryIcons();

const meta: Meta<RealUiSourceComponent> = {
  title: 'Prototypes/Intro Story/Flows/Share the find',
  component: RealUiSourceComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Intentional Share-the-find story flows — real UI + SyncedGestureController. Each story is one recognizable intention.',
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

const flowStory = (flowId: string, title: string, caption: string): Story => ({
  name: title,
  args: {
    beat: 'share',
    framed: true,
    badge: 'Share · Flow',
    flowId,
    caption,
    simulate: true,
  },
});

export const HomeCreatePublishReactions: Story = flowStory(
  SHARE_THE_FIND_FLOWS[0].id,
  SHARE_THE_FIND_FLOWS[0].title,
  SHARE_THE_FIND_FLOWS[0].caption,
);

export const TypedNameThenPhoto: Story = flowStory(
  SHARE_THE_FIND_FLOWS[1].id,
  SHARE_THE_FIND_FLOWS[1].title,
  SHARE_THE_FIND_FLOWS[1].caption,
);

export const PhotoFirstThenPriceTags: Story = flowStory(
  SHARE_THE_FIND_FLOWS[2].id,
  SHARE_THE_FIND_FLOWS[2].title,
  SHARE_THE_FIND_FLOWS[2].caption,
);

export const SkipPhotoThenPublish: Story = flowStory(
  SHARE_THE_FIND_FLOWS[3].id,
  SHARE_THE_FIND_FLOWS[3].title,
  SHARE_THE_FIND_FLOWS[3].caption,
);

export const PublishThenShareSheet: Story = flowStory(
  SHARE_THE_FIND_FLOWS[4].id,
  SHARE_THE_FIND_FLOWS[4].title,
  SHARE_THE_FIND_FLOWS[4].caption,
);

export const CreateDetailsThumbsUp: Story = flowStory(
  SHARE_THE_FIND_FLOWS[5].id,
  SHARE_THE_FIND_FLOWS[5].title,
  SHARE_THE_FIND_FLOWS[5].caption,
);

export const MultiPhotoPickerGrid: Story = flowStory(
  SHARE_THE_FIND_FLOWS[6].id,
  SHARE_THE_FIND_FLOWS[6].title,
  SHARE_THE_FIND_FLOWS[6].caption,
);

export const TagSuggestionsThenPublish: Story = flowStory(
  SHARE_THE_FIND_FLOWS[7].id,
  SHARE_THE_FIND_FLOWS[7].title,
  SHARE_THE_FIND_FLOWS[7].caption,
);

export const LocationPinThenPublish: Story = flowStory(
  SHARE_THE_FIND_FLOWS[8].id,
  SHARE_THE_FIND_FLOWS[8].title,
  SHARE_THE_FIND_FLOWS[8].caption,
);

export const AppearOnHomeFeed: Story = flowStory(
  SHARE_THE_FIND_FLOWS[9].id,
  SHARE_THE_FIND_FLOWS[9].title,
  SHARE_THE_FIND_FLOWS[9].caption,
);
