import { applicationConfig, Meta, Story } from '@storybook/angular';
import { HomeComponent } from '../components';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { FILTERS, PRICES } from './data';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: HomeComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<HomeComponent>;

const Template: Story<HomeComponent> = (args: HomeComponent) => ({
  props: args,
});

/**
 * Since storybook does not call ngOnChanges, where the calculation of
 * filteredPrices and filters takes place, we set the attributes directly
 * here.
 */
export const Primary = Template.bind({});

Primary.args = {
  isAuthenticated: true,
  filteredPrices: PRICES,
  filters: FILTERS,
};

export const Empty = Template.bind({});
Empty.args = {
  isAuthenticated: true,
  filters: [
    {
      type: 'location',
      value: 'Cologne',
    },
  ],
  location: 'Cologne',
};
