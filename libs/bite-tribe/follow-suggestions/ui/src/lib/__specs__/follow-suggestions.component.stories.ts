import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { FollowSuggestion } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FollowSuggestionsComponent } from '../follow-suggestions.component';

addNecessaryIcons();

/**
 * No photos: a remote image would make the reference depend on the network,
 * and the placeholder icon is the state a new creator's card is most often in.
 */
const suggestions: FollowSuggestion[] = [
  { userId: 'ana', displayName: 'Ana', biteCount: 12, reason: 'nearby' },
  { userId: 'ben', displayName: 'Ben', biteCount: 4, reason: 'curated' },
  { userId: 'chloe', displayName: 'Chloé', biteCount: 31, reason: 'active' },
  { userId: 'dev', displayName: 'Dev', biteCount: 7, reason: 'active' },
];

const meta: Meta<FollowSuggestionsComponent> = {
  title: 'Components/Follow Suggestions',
  component: FollowSuggestionsComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    suggestions,
    pendingIds: new Set<string>(),
    loading: false,
    dismissible: false,
    linkable: true,
  },
};

export default meta;

type Story = StoryObj<FollowSuggestionsComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { suggestions: [], loading: true },
};

/** The first card's follow is being written. */
export const Pending: Story = {
  args: { pendingIds: new Set(['ana']) },
};

/** The home card, which the user can close. */
export const Dismissible: Story = {
  args: { dismissible: true },
};

/**
 * On a centred surface - the onboarding finish step and the empty Following
 * list - the heading and the row centre with it.
 */
export const Centered: Story = {
  args: { centered: true },
};

/** A display name too long for the card stays on one line. */
export const LongDisplayName: Story = {
  args: {
    suggestions: [
      {
        userId: 'long',
        displayName: 'Maximiliane Alexandra von Hohenberg-Wittelsbach',
        biteCount: 1,
        reason: 'nearby',
      },
      ...suggestions.slice(1, 2),
    ],
  },
};
