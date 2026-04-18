import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { currencyCodes, getSimilarityScore, normalize } from 'utils';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'currency-selector',
  templateUrl: './currency-selector.component.html',
  styleUrl: './currency-selector.component.scss',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySelectorComponent {
  selectedCurrency = input<string>('EUR');
  favoriteCurrencies = input<string[] | undefined>([]);
  disableFavChange = input<boolean>(false);

  leftButtonLangCode = input<string>('cancel');

  currencySelected = output<string>();
  favoriteCurrencyToggled = output<string>();
  selectionCancel = output<void>();

  currencies = currencyCodes;
  rawSearchTerm = signal('');

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
        const nameMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(currency.name),
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

  searchbarInput(event: Event): void {
    const target = event.target as HTMLIonSearchbarElement;
    this.rawSearchTerm.set(target.value?.toLowerCase() || '');
  }

  selectCurrency(code: string): void {
    this.currencySelected.emit(code);
  }

  toggleFavorite(event: Event, code: string): void {
    event.stopPropagation();
    this.favoriteCurrencyToggled.emit(code);
  }

  isFavorite(currencyCode: string): boolean {
    return this.favoriteCurrencies()?.includes(currencyCode) || false;
  }

  cancel(): void {
    this.selectionCancel.emit();
  }
}
