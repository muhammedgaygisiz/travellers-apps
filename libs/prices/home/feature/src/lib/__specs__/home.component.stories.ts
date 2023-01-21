import { IonicModule } from '@ionic/angular';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { HomeComponent } from '../components';
import { getIonicConfig } from '@travellers-apps/utils-common';

export default {
  title: 'Pages/Home',
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig()), HomeComponent],
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
  filteredPrices: [
    {
      id: '1',
      src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
      name: 'Apples',
      price: 0.2,
      location: 'Marrakech',
    },
    {
      id: '2',
      src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
      name: 'Bears',
      price: 0.2,
      location: 'Marrakech',
    },
    {
      id: '3',
      src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      name: 'Peaches',
      price: 0.2,
      location: 'Marrakech',
    },
  ],
  filters: [
    {
      type: 'location',
      value: 'Marrakech',
    },
  ],
};
