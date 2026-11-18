import { applicationConfig, Meta, StoryFn, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteExplanationComponent } from '../bite-explanation.component';

addNecessaryIcons();

/**
 * The AI explanation of a Bite's dish, as the modal shows it (issue #2106):
 * one story per state `DetailsService` can hand in. The disclaimer is under
 * every one of them.
 */
export default {
  title: 'Components/Bite Explanation',
  component: BiteExplanationComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  render: (args): ReturnType<StoryFn<BiteExplanationComponent>> => ({
    props: args,
    template: `
      <div style="position: relative; height: 100vh">
        <bt-bite-explanation
          class="ion-page"
          [dishName]="dishName"
          [state]="state"
        />
      </div>
    `,
  }),
  args: { dishName: 'Som Tam' },
} satisfies Meta<BiteExplanationComponent>;

type Story = StoryObj<BiteExplanationComponent>;

/** The modal opens at once, before the backend has answered. */
export const Loading: Story = {
  args: { state: { kind: 'loading' } },
};

/** The three parts, in the viewer's language. */
export const Explained: Story = {
  args: {
    state: {
      kind: 'ok',
      explanation: {
        whatItIs:
          'A spicy salad of shredded green papaya, pounded in a mortar with lime, fish sauce and palm sugar.',
        origin:
          'From Isan, in north-eastern Thailand, and eaten all over the country, often with sticky rice and grilled chicken.',
        ingredients: [
          'green papaya',
          'lime',
          'fish sauce',
          'palm sugar',
          'chilli',
          'peanuts',
        ],
      },
    },
  },
};

/** The model could not tell which dish this is. */
export const Unknown: Story = {
  args: { dishName: 'Lunch special', state: { kind: 'unknown' } },
};

/** The day's new explanations are used up. */
export const LimitReached: Story = {
  args: { state: { kind: 'limit' } },
};

/** A failed call, offline included, offers Retry. */
export const Failed: Story = {
  args: { state: { kind: 'error' } },
};
