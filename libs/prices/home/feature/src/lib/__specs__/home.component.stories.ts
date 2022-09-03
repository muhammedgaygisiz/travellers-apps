import { IonicModule } from '@ionic/angular';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import {
  HomeComponent,
  HomeComponentModule,
} from '@travellers-apps/prices/home/feature';

export default {
  title: 'Home Component',
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
Primary.args = {};
