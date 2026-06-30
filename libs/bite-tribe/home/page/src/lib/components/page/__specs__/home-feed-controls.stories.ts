import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { HomeFeedControlsComponent } from '../home-feed-controls.component';

addNecessaryIcons();

export default {
  title: 'Components/Feed Controls',
  component: HomeFeedControlsComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<HomeFeedControlsComponent>;

type Story = StoryObj<HomeFeedControlsComponent>;

export const Default: Story = {
  args: {
    showFilters: true,
    hasActiveFilters: false,
    numberOfFilters: 0,
    showSearchChip: false,
    showMap: true,
    sorting: 'distance',
    sortingLabel: 'Distance',
  },
};

export const ActiveFilters: Story = {
  args: {
    ...Default.args,
    hasActiveFilters: true,
    numberOfFilters: 3,
  },
};

export const HomeFeed: Story = {
  args: {
    ...Default.args,
    showFilters: false,
    showSearchChip: true,
  },
};

export const RestaurantBites: Story = {
  args: {
    ...Default.args,
    showMap: false,
    sorting: 'rating',
    sortingLabel: 'Rating',
  },
};
