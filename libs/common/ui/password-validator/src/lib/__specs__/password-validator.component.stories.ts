import {
  applicationConfig,
  argsToTemplate,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { PasswordValidatorComponent } from '../component/password-validator.component';
import { of } from 'rxjs';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTransloco } from '@jsverse/transloco';

addNecessaryIcons();

export default {
  title: 'Components/Password Validator',
  component: PasswordValidatorComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            fallbackLang: ['en'],
          },
        }),
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
    },
    template: `<ta-password-validator ${argsToTemplate(args)}/>`,
  }),
} as Meta<PasswordValidatorComponent>;

type Story = StoryObj<PasswordValidatorComponent>;
export const Primary: Story = {
  args: {
    password$: of('Abcd2100'),
  },
};
