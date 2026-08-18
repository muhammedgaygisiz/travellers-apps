import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BiteTribeHomeComponent } from '../home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: BiteTribeHomeComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BiteTribeHomeComponent>;

type Story = StoryObj<BiteTribeHomeComponent>;
export const MyBites: Story = {
  args: {
    isAuthenticated: true,
    allTags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
    title: 'My Bites',
    showFooter: false,
    showHeaderMenu: false,
    enableBackButton: true,
    editableBites: true,
    bites: [
      {
        id: '1',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '2',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '3',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '4',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '5',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '6',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
    ],
  },
};

/**
 * Ionic's ios searchbar centres its placeholder by measuring the text once, in
 * `componentDidLoad`, and it watches `value` but not `placeholder`. Transloco
 * fetches its catalogue over HTTP, so on the very first render after boot the
 * placeholder binding is still `''`: Ionic measures a zero-width string, sets
 * `padding-left: calc(50% - 0px)`, and never re-measures — the placeholder then
 * starts at the middle of the field instead of being centred in it. Opening the
 * field a second time renders correctly, which is why the app never shows this
 * and only a story mounting straight after boot can.
 *
 * Waiting for a translated chip label before opening the search reproduces what
 * the app actually renders, and keeps the reference off a race whose outcome
 * depends on when the catalogue response lands.
 */
const openSearchOnceTranslated = async (
  canvasElement: HTMLElement,
): Promise<void> => {
  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  for (let attempt = 0; attempt < 100; attempt++) {
    const label = canvasElement.querySelector(
      '[data-testid="home-feed-controls"] ion-chip ion-text',
    );

    if (label?.textContent?.trim()) {
      break;
    }

    await nextFrame();
  }

  canvasElement
    .querySelector<HTMLElement>('[data-testid="btn-search"]')
    ?.click();
};

/**
 * The open searchbar at desktop width, where the content column is wider than
 * the field's 720px cap. The field is centred in that column, so it lines up
 * with the centred `Filter` / `Bitemap` / `Distance` chip row directly above it
 * instead of sitting flush against the column's start. See GitHub issue #1344.
 */
export const MyBitesSearch: Story = {
  args: {
    ...MyBites.args,
    showSearch: true,
  },
  globals: {
    viewport: { value: 'desktop' },
  },
  play: ({ canvasElement }) => openSearchOnceTranslated(canvasElement),
};
