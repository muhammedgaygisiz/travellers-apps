import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CurrencySelectorComponent } from 'currency-selector';
import { currencyCodes, getLocalizedCurrencyName } from 'utils';

/**
 * Currency onboarding step. The default currency is mandatory and arrives
 * prefilled from the device locale; favorite currencies are an optional
 * multi-select.
 *
 * Both pickers reuse the shared {@link CurrencySelectorComponent} in a modal,
 * matching the settings page so the two surfaces stay consistent. The step is
 * presentational: the parent owns the selection and decides when it is valid.
 */
@Component({
  selector: 'onboarding-currency-step',
  templateUrl: './currency-step.component.html',
  styleUrl: './currency-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonItem,
    IonLabel,
    IonText,
    IonIcon,
    IonModal,
    CurrencySelectorComponent,
    TranslocoPipe,
  ],
})
export class CurrencyStepComponent {
  private readonly transloco = inject(TranslocoService);

  currency = input<string>('EUR');
  favoriteCurrencies = input<readonly string[]>([]);

  currencyChange = output<string>();
  favoriteCurrencyToggle = output<string>();

  protected readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  protected readonly selectedCurrencyName = computed(() =>
    this.currencyName(this.currency()),
  );

  protected readonly favoriteCurrencyNames = computed(() =>
    this.favoriteCurrencies()
      .map((code) => this.currencyName(code))
      .filter((name): name is string => !!name)
      .join(', '),
  );

  protected readonly favoriteCurrencyList = computed(() => [
    ...this.favoriteCurrencies(),
  ]);

  selectCurrency(code: string, modal: IonModal): void {
    this.currencyChange.emit(code);
    void modal.dismiss();
  }

  toggleFavorite(code: string): void {
    this.favoriteCurrencyToggle.emit(code);
  }

  private currencyName(code: string): string | undefined {
    const currency = currencyCodes.find((entry) => entry.code === code);

    return currency
      ? getLocalizedCurrencyName(
          currency.code,
          this.activeLang(),
          currency.name,
        )
      : undefined;
  }
}
