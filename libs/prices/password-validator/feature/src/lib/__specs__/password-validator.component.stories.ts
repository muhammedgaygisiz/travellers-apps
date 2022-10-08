import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { IonicModule } from '@ionic/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { PasswordValidatorModule } from '../password-validator.module';
import { PasswordValidatorComponent } from '../password-validator/password-validator.component';

export default {
  title: 'Components/Password Validtor',
  component: PasswordValidatorComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig()), PasswordValidatorModule],
    }),
  ],
} as Meta<PasswordValidatorComponent>;

const Template: Story<PasswordValidatorComponent> = (
  args: PasswordValidatorComponent
) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {};
