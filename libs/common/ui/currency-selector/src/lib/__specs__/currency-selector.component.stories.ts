import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CurrencySelectorComponent } from '../currency-selector.component';

addNecessaryIcons();

export default {
  title: 'Components/Currency Selector',
  component: CurrencySelectorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [CurrencySelectorComponent, IonApp],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="height: 100vh">
        <currency-selector
          [selectedCurrency]="selectedCurrency"
          [favoriteCurrencies]="favoriteCurrencies"
          [disableFavChange]="disableFavChange"
          [leftButtonLangCode]="leftButtonLangCode"
        />
        </div>
      </ion-app>
    `,
  }),
} as Meta<CurrencySelectorComponent>;

type Story = StoryObj<CurrencySelectorComponent>;

export const Default: Story = {
  args: {
    selectedCurrency: 'EUR',
    favoriteCurrencies: [],
    disableFavChange: false,
    leftButtonLangCode: 'cancel',
  },
};

export const WithFavorites: Story = {
  args: {
    ...Default.args,
    selectedCurrency: 'EUR',
    favoriteCurrencies: ['USD', 'CHF', 'THB'],
  },
};

export const ReadonlyFavorites: Story = {
  args: {
    ...WithFavorites.args,
    disableFavChange: true,
  },
};
