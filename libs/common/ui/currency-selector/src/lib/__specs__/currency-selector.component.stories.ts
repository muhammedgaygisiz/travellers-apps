import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CurrencySelectorComponent } from '../currency-selector.component';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

const MockTranslocoService = {
  translate: (key: string): string => key,
  config: {
    reRenderOnLangChange: (): boolean => true,
  },
  langChanges$: of(),
};

export default {
  title: 'Components/Currency Selector',
  component: CurrencySelectorComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
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
