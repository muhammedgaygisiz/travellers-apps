import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { SearchBite } from 'model';
import { MAX_RESULTS } from 'bite-tribe-admin/bites-data-access';
import { BiteSearchComponent } from '../bite-search.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const BITE_IMAGE = 'assets/demo/bite-demo.png';

const reported: SearchBite = {
  id: 'bite-7Qk2ZzV1',
  name: 'Margherita al forno',
  place: 'Trattoria Roma',
  imagePath: BITE_IMAGE,
  description:
    'Reported twice for the caption. The photo itself is food, which is the ' +
    'question the image is here to settle.',
  tags: ['pizza', 'napoli', 'wood-fired'],
  rating: 4,
};

const withoutImage: SearchBite = {
  id: 'bite-3Hd9Lm4P',
  name: 'Kaiserschmarrn',
  place: 'Café Sperl',
  description:
    'A Bite whose upload never completed, so there is nothing to look at.',
  tags: [],
};

const results: SearchBite[] = [
  reported,
  withoutImage,
  {
    id: 'bite-91TbQx8s',
    name: 'Pho bo tai',
    place: 'Quán Ăn Ngon',
    imagePath: BITE_IMAGE,
    tags: ['pho', 'beef'],
  },
];

/**
 * A result set that fills the callable's cap.
 *
 * The cap note only appears at `MAX_RESULTS`, and a truncated answer is
 * indistinguishable from a complete one without it - which is how an operator
 * concludes a Bite does not exist when it does.
 */
const cappedResults: SearchBite[] = Array.from(
  { length: MAX_RESULTS },
  (_unused, index) => ({
    id: `bite-capped-${index}`,
    name: `Pizza variant ${index + 1}`,
    place: 'Trattoria Roma',
  }),
);

export default {
  title: 'Admin/Bite Search',
  component: BiteSearchComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    results: [],
    searching: false,
    searched: false,
    failed: false,
    selected: undefined,
    deleting: false,
  },
} as Meta<BiteSearchComponent>;

type Story = StoryObj<BiteSearchComponent>;

/**
 * Nothing has been searched yet. Unlike the account list there is no "all the
 * Bites" to show, so the list column explains what to type.
 */
export const Idle: Story = {};

/** The callable is running. */
export const Searching: Story = {
  args: { searching: true },
};

/**
 * Results with one selected: the image leads the detail column, because on a
 * reported Bite the image is usually the thing that has to be judged.
 */
export const ResultSelected: Story = {
  args: { results, searched: true, selected: reported },
};

/** A Bite with no usable image, so the detail column says so outright. */
export const SelectedWithoutImage: Story = {
  args: { results, searched: true, selected: withoutImage },
};

/** The search filled the callable's cap, so the answer may be truncated. */
export const CappedResults: Story = {
  args: { results: cappedResults, searched: true },
};

/** Searched and matched nothing - not the same as never having searched. */
export const NoResults: Story = {
  args: { searched: true },
};

/** The callable failed, which is not an empty result set. */
export const Failed: Story = {
  args: { searched: true, failed: true },
};

/** The delete is in flight. */
export const Deleting: Story = {
  args: {
    results,
    searched: true,
    selected: reported,
    deleting: true,
  },
};
