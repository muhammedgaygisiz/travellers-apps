import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { CurrencyStepComponent } from '../currency-step.component';

export default {
  title: 'Pages/Onboarding/Currency Step',
  component: CurrencyStepComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    currency: 'EUR',
    favoriteCurrencies: [],
  },
} as Meta<CurrencyStepComponent>;

type Story = StoryObj<CurrencyStepComponent>;

/** Prefilled from the device locale, with favorites left empty. */
export const PrefilledWithoutFavorites: Story = {};

export const WithFavorites: Story = {
  args: {
    currency: 'TRY',
    favoriteCurrencies: ['EUR', 'USD', 'GBP'],
  },
};
