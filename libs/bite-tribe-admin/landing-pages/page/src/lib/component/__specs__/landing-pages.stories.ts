import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SearchBite } from 'model';
import {
  LandingPage,
  LandingPageDraft,
} from 'bite-tribe-admin/landing-pages-data-access';
import { LandingPagesComponent } from '../landing-pages.component';
import { LandingPageEntry } from '../landing-page-entry';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const BITE_IMAGE = 'assets/demo/bite-demo.png';

const draft: LandingPageDraft = {
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'DE',
  locale: 'en',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five sushi dishes in Berlin, picked from real Bites.',
  intro: 'Three places, one question: where is the fish best?',
  biteIds: ['b1', 'b2', 'b3'],
};

const entries: LandingPageEntry[] = [
  {
    biteId: 'b1',
    name: 'Salmon nigiri',
    place: 'Sushi Ya',
    imageUrl: BITE_IMAGE,
  },
  { biteId: 'b2', name: 'Tuna maki', place: 'Kuchi', imageUrl: BITE_IMAGE },
  { biteId: 'b3', name: 'Chirashi', place: 'Cocolo', imageUrl: BITE_IMAGE },
];

const pages: LandingPage[] = [
  {
    ...draft,
    status: 'published',
    items: entries.map((entry) => ({ ...entry, imageUrl: BITE_IMAGE })),
  },
  {
    ...draft,
    city: 'munich',
    cityName: 'Munich',
    title: 'Late-night ramen in Munich',
    status: 'draft',
    biteIds: [],
    items: [],
  },
  {
    ...draft,
    city: 'hamburg',
    cityName: 'Hamburg',
    title: 'Brunch in Hamburg',
    status: 'withdrawn',
    items: [],
  },
];

const results: SearchBite[] = [
  { id: 'b4', name: 'Eel nigiri', place: 'Sushi Ya', imagePath: BITE_IMAGE },
  { id: 'b1', name: 'Salmon nigiri', place: 'Sushi Ya', imagePath: BITE_IMAGE },
  { id: 'b5', name: 'Temaki', place: 'Kuchi' },
];

export default {
  title: 'Admin/City Pages',
  component: LandingPagesComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    pages,
    loading: false,
    loadFailed: false,
    editing: false,
    current: undefined,
    draft: { ...draft, city: '', cityName: '', title: '', biteIds: [] },
    entries: [],
    results: [],
    searching: false,
    busy: false,
    publishable: false,
    full: false,
    previewHtml: undefined,
  },
} as Meta<LandingPagesComponent>;

type Story = StoryObj<LandingPagesComponent>;

/** The saved pages, nothing open yet. */
export const List: Story = {};

/** No pages at all. */
export const Empty: Story = {
  args: { pages: [] },
};

/** A new page: details empty, no Bites, Publish explains what it needs. */
export const NewPage: Story = {
  args: { editing: true },
};

/**
 * A published page with three Bites in order, search results to add from
 * (the one already chosen and the one without a photo cannot be added), and
 * Withdraw across the line.
 */
export const EditingPublished: Story = {
  args: {
    editing: true,
    current: pages[0],
    draft,
    entries,
    results,
    publishable: true,
  },
};

/** Five Bites: the search is replaced by the limit. */
export const Full: Story = {
  args: {
    editing: true,
    current: pages[1],
    draft: {
      ...draft,
      city: 'munich',
      cityName: 'Munich',
      title: 'Late-night ramen in Munich',
      biteIds: [],
    },
    entries: [
      ...entries,
      {
        biteId: 'b4',
        name: 'Eel nigiri',
        place: 'Sushi Ya',
        imageUrl: BITE_IMAGE,
      },
      { biteId: 'b5', name: 'Temaki', place: 'Kuchi', imageUrl: BITE_IMAGE },
    ],
    publishable: true,
    full: true,
  },
};
