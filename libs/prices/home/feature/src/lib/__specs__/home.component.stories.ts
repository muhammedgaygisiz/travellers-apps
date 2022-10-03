import { IonicModule } from '@ionic/angular';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { HomeComponentModule } from '../home.module';
import { HomeComponent } from '../components';
import { getIonicConfig } from '@travellers-apps/utils-common';

export default {
  title: 'Pages/Home',
  component: HomeComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig()), HomeComponentModule],
    }),
  ],
} as Meta<HomeComponent>;

const Template: Story<HomeComponent> = (args: HomeComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  isAuthenticated: true,
  mostSearchedEntries: [
    {
      id: '1',
      src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
      name: 'Apples',
      price: 0.2,
    },
    {
      id: '2',
      src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
      name: 'Bears',
      price: 0.2,
    },
    {
      id: '3',
      src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
      name: 'Peaches',
      price: 0.2,
    },
  ],
};
