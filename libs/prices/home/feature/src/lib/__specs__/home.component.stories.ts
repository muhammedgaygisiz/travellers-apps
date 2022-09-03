import { IonicModule } from '@ionic/angular';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import {
  HomeComponent,
  HomeComponentModule,
} from '@travellers-apps/prices/home/feature';
import {dummyEntries} from "../dummies";

export default {
  title: 'Pages/Home',
  component: HomeComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(), HomeComponentModule],
    }),
  ],
} as Meta<HomeComponent>;

const Template: Story<HomeComponent> = (args: HomeComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  mostSearchedEntries: dummyEntries
};
