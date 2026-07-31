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
          [mode]="mode"
          [selectedCurrency]="selectedCurrency"
          [favoriteCurrencies]="favoriteCurrencies"
          [leftButtonLangCode]="leftButtonLangCode"
        />
        </div>
      </ion-app>
    `,
  }),
} as Meta<CurrencySelectorComponent>;

type Story = StoryObj<CurrencySelectorComponent>;

/** Picking the one currency prices are shown in. */
export const Default: Story = {
  args: {
    mode: 'preferred',
    selectedCurrency: 'EUR',
    favoriteCurrencies: [],
    leftButtonLangCode: 'cancel',
  },
};

/** Same single pick, with favorites sorted to the top and marked as such. */
export const WithFavorites: Story = {
  args: {
    ...Default.args,
    selectedCurrency: 'EUR',
    favoriteCurrencies: ['USD', 'CHF', 'THB'],
  },
};

/** The multi-select variant with nothing picked yet. */
export const FavoritesEmpty: Story = {
  args: {
    ...Default.args,
    mode: 'favorites',
    favoriteCurrencies: [],
    leftButtonLangCode: 'save',
  },
};

/** The multi-select variant with currencies already added. */
export const FavoritesSelected: Story = {
  args: {
    ...FavoritesEmpty.args,
    favoriteCurrencies: ['USD', 'CHF', 'THB'],
  },
};
