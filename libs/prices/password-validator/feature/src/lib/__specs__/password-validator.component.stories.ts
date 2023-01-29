import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { IonicModule } from '@ionic/angular';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { PasswordValidatorComponent } from '../component/password-validator.component';
import { of } from 'rxjs';

export default {
  title: 'Components/Password Validator',
  component: PasswordValidatorComponent,
  decorators: [
    moduleMetadata({
      imports: [IonicModule.forRoot(getIonicConfig())],
    }),
  ],
} as Meta<PasswordValidatorComponent>;

type PasswordValidatorProps = { password: string };
const Template: Story<PasswordValidatorProps> = ({ password }) => ({
  props: {
    password$: of(password),
  },
  template: `
    <ta-password-validator [password$]="password$"></ta-password-validator>
  `,
});

export const Primary = Template.bind({});
Primary.args = {
  password: 'Abcd2100',
};
