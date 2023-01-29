import { AuthComponent } from '../components/auth.component';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { IonicModule } from '@ionic/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';

export default {
  title: 'Pages/Auth',
  component: AuthComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig())],
    }),
  ],
} as Meta<AuthComponent>;

const Template: Story<AuthComponent> = (args: AuthComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
