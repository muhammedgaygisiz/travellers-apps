import { AuthComponent } from '../components/auth.component';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { IonicModule } from '@ionic/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { AuthModule } from '../auth.module';

export default {
  title: 'Pages/Auth',
  component: AuthComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig()), AuthModule],
    }),
  ],
} as Meta<AuthComponent>;

const Template: Story<AuthComponent> = (args: AuthComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
