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
import {
  countries,
  type Country,
  getLocalizedCountryName,
  getSimilarityScore,
  normalize,
} from 'utils';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/**
 * Picks exactly one country from the full ISO 3166-1 alpha-2 list and closes.
 *
 * The list is long enough that scrolling it is not a real option, so the
 * searchbar is the primary control. Rows match on the localized name as well
 * as the code, so a German speaker finds "Schweiz" and a traveler who only
 * knows the plate code finds "CH".
 */
@Component({
  selector: 'country-selector',
  templateUrl: './country-selector.component.html',
  styleUrl: './country-selector.component.scss',
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
export class CountrySelectorComponent {
  private readonly transloco = inject(TranslocoService);

  selectedCountry = input<string | undefined>(undefined);

  leftButtonLangCode = input<string>('cancel');

  countrySelected = output<string>();
  selectionCancel = output<void>();

  countries = countries;
  rawSearchTerm = signal('');
  activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  /**
   * Sorted by localized name so the list reads alphabetically in the user's
   * language, not in English.
   */
  private readonly localizedCountries = computed(() => {
    const lang = this.activeLang();
    const collator = new Intl.Collator(lang);

    return this.countries
      .map((country) => ({
        country,
        name: getLocalizedCountryName(country.code, lang, country.name),
      }))
      .sort((a, b) => collator.compare(a.name, b.name));
  });

  filteredCountries = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const localizedCountries = this.localizedCountries();

    if (!searchTerm) {
      return localizedCountries.map(({ country }) => country);
    }

    const normalizedSearchTerm = normalize(searchTerm);

    return localizedCountries
      .map(({ country, name }) => {
        const nameMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(name),
        );
        const codeMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(country.code),
        );

        const nameScore = nameMatches.length > 0 ? nameMatches[0].score : 0;
        const codeScore = codeMatches.length > 0 ? codeMatches[0].score : 0;

        return {
          country,
          score: Math.max(nameScore, codeScore),
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ country }) => country);
  });

  getCountryName(country: Country): string {
    return getLocalizedCountryName(
      country.code,
      this.activeLang(),
      country.name,
    );
  }

  /** The `flag-icons` class for the rectangular flag of this country. */
  getFlagClass(country: Country): string {
    return `fi fi-${country.code.toLowerCase()}`;
  }

  searchbarInput(event: Event): void {
    const target = event.target as HTMLIonSearchbarElement;
    this.rawSearchTerm.set(target.value?.toLowerCase() || '');
  }

  selectRow(code: string): void {
    this.countrySelected.emit(code);
  }

  /**
   * The row is the accessible control, so its name has to carry both what the
   * tap does and where the country currently stands.
   */
  rowLabel(country: Country): string {
    const params = { country: this.getCountryName(country) };

    return this.transloco.translate(
      this.selectedCountry() === country.code
        ? 'country-selected'
        : 'select-country-option',
      params,
    );
  }

  cancel(): void {
    this.selectionCancel.emit();
  }
}
