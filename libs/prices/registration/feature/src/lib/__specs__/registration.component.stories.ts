import { RegistrationComponent } from '../components/registration.component';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { IonicModule } from '@ionic/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';

export default {
  title: 'Pages/Registration',
  component: RegistrationComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig())],
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
