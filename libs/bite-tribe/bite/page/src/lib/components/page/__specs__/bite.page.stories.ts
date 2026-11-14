import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BitePage } from '../bite.page';
import type { Bite } from 'model';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Create Bite',
  component: BitePage,
  // The form is shared with the edit page, and `isNew` is what tells the two
  // apart - down to the heading. Every story here shows the create page unless
  // it says otherwise.
  args: {
    isNew: true,
  },
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BitePage>;

type Story = StoryObj<BitePage>;
export const Empty: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
  },
};

/**
 * No source has resolved a position yet, so the location section offers the
 * call to action instead of a row naming a source.
 */
export const WithoutPosition: Story = {
  args: {},
};

export const WithTagSuggestions: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
    suggestedTags: ['vegan', 'spicy', 'gluten-free', 'dessert', 'quick'],
  },
};

/** The same form reached by editing an existing Bite, headed accordingly. */
export const EditBite: Story = {
  args: {
    isNew: false,
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
  },
};

export const CurrencyLoading: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
    currency: 'EUR',
    currencyLoading: true,
  },
};

/**
 * A draft copied from another member's Bite that is older than 30 days: the
 * price comes along, dated, so the poster checks it (issue #2018). The fixed
 * date is far enough back to stay old on every run.
 */
export const CopiedWithOldPrice: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
    bite: {
      name: 'Hibiscus ice tea',
      place: 'Einstein au Jardin',
      price: 4.5,
      currency: 'CHF',
      position: {
        latitude: 46.9422564444011,
        longitude: 7.457160053942448,
      },
      copiedFrom: {
        biteId: 'sams-bite',
        createdAt: '2020-03-02T19:00:00.000Z',
      },
    } as Bite,
  },
};
