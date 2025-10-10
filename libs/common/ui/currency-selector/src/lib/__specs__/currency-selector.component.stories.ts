import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { CurrencySelectorComponent } from '../currency-selector.component';

export default {
  title: 'Components/Currency Selector',
  component: CurrencySelectorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<CurrencySelectorComponent>;

type Story = StoryObj<CurrencySelectorComponent>;

export const Default: Story = {
  args: {
    selectedCurrency: 'EUR',
  },
};

export const WithUSD: Story = {
  args: {
    selectedCurrency: 'USD',
  },
};

export const WithGBP: Story = {
  args: {
    selectedCurrency: 'GBP',
  },
};
