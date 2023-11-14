import { RegistrationComponent } from '../components/registration.component';
import { applicationConfig, Meta, Story } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Registration',
  component: RegistrationComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<RegistrationComponent>;

const Template: Story<RegistrationComponent> = (
  args: RegistrationComponent
) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
