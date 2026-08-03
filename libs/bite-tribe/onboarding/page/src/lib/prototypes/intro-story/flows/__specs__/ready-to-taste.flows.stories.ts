import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RealUiSourceComponent } from '../../source-real-ui/real-ui-source.component';
import { READY_TO_TASTE_FLOWS } from '../tribe-go-flows';

addNecessaryIcons();

const meta: Meta<RealUiSourceComponent> = {
  title: 'Prototypes/Intro Story/Flows/Ready to taste',
  component: RealUiSourceComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Intentional Ready-to-taste story flows — real UI + SyncedGestureController. Each story is one recognizable intention.',
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
    beat: 'go',
    framed: true,
    badge: 'Go · Flow',
    flowId,
    caption,
    simulate: true,
  },
});

export const MapPinDrawerDirections: Story = flowStory(
  READY_TO_TASTE_FLOWS[0].id,
  READY_TO_TASTE_FLOWS[0].title,
  READY_TO_TASTE_FLOWS[0].caption,
);

export const HomeBitemapChipThenGo: Story = flowStory(
  READY_TO_TASTE_FLOWS[1].id,
  READY_TO_TASTE_FLOWS[1].title,
  READY_TO_TASTE_FLOWS[1].caption,
);

export const PanMapThenSelectPin: Story = flowStory(
  READY_TO_TASTE_FLOWS[2].id,
  READY_TO_TASTE_FLOWS[2].title,
  READY_TO_TASTE_FLOWS[2].caption,
);

export const PinFullDetailsDirections: Story = flowStory(
  READY_TO_TASTE_FLOWS[3].id,
  READY_TO_TASTE_FLOWS[3].title,
  READY_TO_TASTE_FLOWS[3].caption,
);

export const CompareTwoPinsThenChoose: Story = flowStory(
  READY_TO_TASTE_FLOWS[4].id,
  READY_TO_TASTE_FLOWS[4].title,
  READY_TO_TASTE_FLOWS[4].caption,
);

export const RecenterThenNearestPin: Story = flowStory(
  READY_TO_TASTE_FLOWS[5].id,
  READY_TO_TASTE_FLOWS[5].title,
  READY_TO_TASTE_FLOWS[5].caption,
);

export const DrawerExpandThenNavigate: Story = flowStory(
  READY_TO_TASTE_FLOWS[6].id,
  READY_TO_TASTE_FLOWS[6].title,
  READY_TO_TASTE_FLOWS[6].caption,
);

export const PinDetailsBackToMap: Story = flowStory(
  READY_TO_TASTE_FLOWS[7].id,
  READY_TO_TASTE_FLOWS[7].title,
  READY_TO_TASTE_FLOWS[7].caption,
);

export const FarthestThenNearest: Story = flowStory(
  READY_TO_TASTE_FLOWS[8].id,
  READY_TO_TASTE_FLOWS[8].title,
  READY_TO_TASTE_FLOWS[8].caption,
);

export const WalkingDirectionsSuccess: Story = flowStory(
  READY_TO_TASTE_FLOWS[9].id,
  READY_TO_TASTE_FLOWS[9].title,
  READY_TO_TASTE_FLOWS[9].caption,
);
