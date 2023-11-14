import { applicationConfig, Meta, Story } from '@storybook/angular';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { PasswordValidatorComponent } from '../component/password-validator.component';
import { of } from 'rxjs';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Components/Password Validator',
  component: PasswordValidatorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<PasswordValidatorComponent>;

type PasswordValidatorProps = { password: string };
const Template: Story<PasswordValidatorProps> = ({ password }) => ({
  props: {
    password$: of(password),
  },
  template: `
    <ta-password-validator [password$]="password$"/>
  `,
});

export const Primary = Template.bind({});
Primary.args = {
  password: 'Abcd2100',
};
