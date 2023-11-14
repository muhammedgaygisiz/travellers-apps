import { AuthComponent } from '../components/auth.component';
import { applicationConfig, Meta, Story } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Auth',
  component: AuthComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<AuthComponent>;

const Template: Story<AuthComponent> = (args: AuthComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
