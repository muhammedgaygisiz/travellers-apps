import {
  applicationConfig,
  Meta,
  StoryObj,
  argsToTemplate,
} from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { RealUiSourceComponent } from '../../source-real-ui/real-ui-source.component';
import { FIND_THE_BITE_FLOWS } from '../flow-scripts';

addNecessaryIcons();

const meta: Meta<RealUiSourceComponent> = {
  title: 'Prototypes/Intro Story/Flows/Find the bite',
  component: RealUiSourceComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Intentional Find-the-bite story flows — real UI + SyncedGestureController. Each story is one recognizable intention.',
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
    beat: 'discover',
    framed: true,
    badge: 'Find · Flow',
    flowId,
    caption,
    simulate: true,
  },
});

export const ScrollToCardThenOpen: Story = flowStory(
  FIND_THE_BITE_FLOWS[0].id,
  FIND_THE_BITE_FLOWS[0].title,
  FIND_THE_BITE_FLOWS[0].caption,
);

export const TapFirstVisibleCard: Story = flowStory(
  FIND_THE_BITE_FLOWS[1].id,
  FIND_THE_BITE_FLOWS[1].title,
  FIND_THE_BITE_FLOWS[1].caption,
);

export const UseSearchChipThenOpen: Story = flowStory(
  FIND_THE_BITE_FLOWS[2].id,
  FIND_THE_BITE_FLOWS[2].title,
  FIND_THE_BITE_FLOWS[2].caption,
);

export const FilterByTagThenOpen: Story = flowStory(
  FIND_THE_BITE_FLOWS[3].id,
  FIND_THE_BITE_FLOWS[3].title,
  FIND_THE_BITE_FLOWS[3].caption,
);

export const SortDistanceThenOpenNearest: Story = flowStory(
  FIND_THE_BITE_FLOWS[4].id,
  FIND_THE_BITE_FLOWS[4].title,
  FIND_THE_BITE_FLOWS[4].caption,
);

export const LongBrowseThenOpen: Story = flowStory(
  FIND_THE_BITE_FLOWS[5].id,
  FIND_THE_BITE_FLOWS[5].title,
  FIND_THE_BITE_FLOWS[5].caption,
);

export const OpenThenSwipeBackToFeed: Story = flowStory(
  FIND_THE_BITE_FLOWS[6].id,
  FIND_THE_BITE_FLOWS[6].title,
  FIND_THE_BITE_FLOWS[6].caption,
);

export const DetailsThenRelatedBite: Story = flowStory(
  FIND_THE_BITE_FLOWS[7].id,
  FIND_THE_BITE_FLOWS[7].title,
  FIND_THE_BITE_FLOWS[7].caption,
);

export const RatingStarsThenOpen: Story = flowStory(
  FIND_THE_BITE_FLOWS[8].id,
  FIND_THE_BITE_FLOWS[8].title,
  FIND_THE_BITE_FLOWS[8].caption,
);

export const QuickPeekThenBack: Story = flowStory(
  FIND_THE_BITE_FLOWS[9].id,
  FIND_THE_BITE_FLOWS[9].title,
  FIND_THE_BITE_FLOWS[9].caption,
);
