import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  currencyCodes,
  getLocalizedCurrencyName,
  getSimilarityScore,
  normalize,
} from 'utils';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/**
 * The two jobs this picker does. They are different selections, not one list
 * with an extra icon: `preferred` picks exactly one currency and closes,
 * `favorites` toggles any number of them and stays open.
 */
export type CurrencySelectorMode = 'preferred' | 'favorites';

@Component({
  selector: 'currency-selector',
  templateUrl: './currency-selector.component.html',
  styleUrl: './currency-selector.component.scss',
  imports: [
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySelectorComponent {
  private readonly transloco = inject(TranslocoService);

  selectedCurrency = input<string>('EUR');
  favoriteCurrencies = input<string[] | undefined>([]);
  mode = input<CurrencySelectorMode>('preferred');

  leftButtonLangCode = input<string>('cancel');

  currencySelected = output<string>();
  favoriteCurrencyToggled = output<string>();
  selectionCancel = output<void>();

  currencies = currencyCodes;
  rawSearchTerm = signal('');
  activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  isFavoritesMode = computed(() => this.mode() === 'favorites');

  titleKey = computed(() =>
    this.isFavoritesMode() ? 'select-favorite-currencies' : 'select-currency',
  );

  instructionKey = computed(() =>
    this.isFavoritesMode()
      ? 'favorite-currencies-instruction'
      : 'preferred-currency-instruction',
  );

  filteredCurrencies = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const favoriteCurrencyCodes = new Set(this.favoriteCurrencies());

    if (!searchTerm) {
      return [...this.currencies].sort(
        (a, b) =>
          Number(favoriteCurrencyCodes.has(b.code)) -
          Number(favoriteCurrencyCodes.has(a.code)),
      );
    }

    const normalizedSearchTerm = normalize(searchTerm);

    return this.currencies
      .map((currency) => {
        const localizedName = this.getCurrencyName(currency);
        const nameMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(localizedName),
        );
        const codeMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(currency.code),
        );

        const nameScore = nameMatches.length > 0 ? nameMatches[0].score : 0;
        const codeScore = codeMatches.length > 0 ? codeMatches[0].score : 0;

        return {
          currency,
          score: Math.max(nameScore, codeScore),
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        const favoriteSortResult =
          Number(favoriteCurrencyCodes.has(b.currency.code)) -
          Number(favoriteCurrencyCodes.has(a.currency.code));

        if (favoriteSortResult !== 0) {
          return favoriteSortResult;
        }

        return b.score - a.score;
      })
      .map(({ currency }) => currency);
  });

  getCurrencyName(currency: (typeof currencyCodes)[number]): string {
    return getLocalizedCurrencyName(
      currency.code,
      this.activeLang(),
      currency.name,
    );
  }

  searchbarInput(event: Event): void {
    const target = event.target as HTMLIonSearchbarElement;
    this.rawSearchTerm.set(target.value?.toLowerCase() || '');
  }

  /**
   * One row, one action. Which action it is depends on the mode, so the row is
   * always the control and nothing hides behind a secondary icon button.
   */
  selectRow(code: string): void {
    if (this.isFavoritesMode()) {
      this.favoriteCurrencyToggled.emit(code);

      return;
    }

    this.currencySelected.emit(code);
  }

  isFavorite(currencyCode: string): boolean {
    return this.favoriteCurrencies()?.includes(currencyCode) || false;
  }

  /**
   * The row is the accessible control, so its name has to carry both what the
   * tap does and where the currency currently stands.
   */
  rowLabel(currency: (typeof currencyCodes)[number]): string {
    const params = { currency: this.getCurrencyName(currency) };

    if (this.isFavoritesMode()) {
      return this.transloco.translate(
        this.isFavorite(currency.code)
          ? 'remove-currency-from-favorites'
          : 'add-currency-to-favorites',
        params,
      );
    }

    return this.transloco.translate(
      this.selectedCurrency() === currency.code
        ? 'currency-selected'
        : 'select-currency-option',
      params,
    );
  }

  cancel(): void {
    this.selectionCancel.emit();
  }
}
