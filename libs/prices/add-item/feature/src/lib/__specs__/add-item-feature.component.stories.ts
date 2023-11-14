import { applicationConfig, Meta, Story } from '@storybook/angular';
import { AddItemComponent } from '../components/add-item.component';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideAnimations } from '@angular/platform-browser/animations';

addNecessaryIcons();

export default {
  title: 'Pages/Add Item',
  component: AddItemComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations(), provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<AddItemComponent>;

const Template: Story<AddItemComponent> = (args: AddItemComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  location: 'Bern',
};
