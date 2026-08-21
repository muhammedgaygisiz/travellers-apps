import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BiteTribeHomeComponent } from '../home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite } from 'model';

addNecessaryIcons();

const bite = (id: string, name: string, place: string): Bite =>
  ({
    id,
    name,
    imagePath: 'assets/demo/bite-demo.png',
    place,
    distance: '0.6',
    rating: 4,
    thumbup: 2,
  }) as Bite;

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

/**
 * Landing page of the weekly summary notification: the bites of one specific
 * week, titled with the week they belong to. Map and filters are off — the week
 * is the filter.
 */
export const WeeklyBites: Story = {
  args: {
    isAuthenticated: true,
    title: 'Bites of the week · 14 Jul – 20 Jul',
    showFooter: false,
    showHeaderMenu: false,
    showAddButton: false,
    enableBackButton: true,
    showMap: false,
    showFilters: false,
    showSearch: true,
    sorting: 'createdAt',
    bites: [
      bite('1', 'Botanic Breeze', 'Einstein au Jardin'),
      bite('2', 'Ramen Shoyu', 'Noodle House'),
      bite('3', 'Tarte Tatin', 'Café Central'),
    ],
  },
};

/** The same page for a week nobody shared a bite in. */
export const WeeklyBitesEmpty: Story = {
  args: {
    isAuthenticated: true,
    title: 'Bites of the week · 14 Jul – 20 Jul',
    showFooter: false,
    showHeaderMenu: false,
    showAddButton: false,
    enableBackButton: true,
    showMap: false,
    showFilters: false,
    showSearch: true,
    sorting: 'createdAt',
    bites: [],
  },
};
