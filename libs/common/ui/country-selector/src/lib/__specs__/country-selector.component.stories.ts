import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CountrySelectorComponent } from '../country-selector.component';

addNecessaryIcons();

export default {
  title: 'Components/Country Selector',
  component: CountrySelectorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [CountrySelectorComponent, IonApp],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="height: 100vh">
        <country-selector
          [selectedCountry]="selectedCountry"
          [leftButtonLangCode]="leftButtonLangCode"
        />
        </div>
      </ion-app>
    `,
  }),
} as Meta<CountrySelectorComponent>;

type Story = StoryObj<CountrySelectorComponent>;

/** Opened from search before the user has narrowed anything down. */
export const Default: Story = {
  args: {
    selectedCountry: undefined,
    leftButtonLangCode: 'cancel',
  },
};

/** Reopened after a pick, so the current country is marked and highlighted. */
export const WithSelection: Story = {
  args: {
    ...Default.args,
    selectedCountry: 'CH',
  },
};
