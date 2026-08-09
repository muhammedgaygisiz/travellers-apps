import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonContent,
  IonIcon,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { SearchbarInputEventDetail } from '@ionic/core';
import { ChipRadioGroupComponent, type ChipRadioOption } from 'common/ui/chip';
import { CountrySelectorComponent } from 'country-selector';
import { getLocalizedCountryName } from 'utils';
import type { Geopoint, SearchCategory, SearchResult } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { SearchListComponent } from '../search-list/search-list.component';

interface SearchCategoryOption {
  labelKey: string;
  value: SearchCategory;
}

@Component({
  selector: 'search-page',
  templateUrl: 'search.page.html',
  styleUrl: 'search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonIcon,
    IonLabel,
    IonModal,
    IonSearchbar,
    IonSpinner,
    IonToggle,
    TranslocoPipe,
    ChipRadioGroupComponent,
    CountrySelectorComponent,
    SearchListComponent,
    MapComponent,
  ],
})
export class SearchPage {
  private readonly translocoService = inject(TranslocoService);

  readonly categories: SearchCategoryOption[] = [
    { labelKey: 'search-category-user', value: 'user' },
    { labelKey: 'search-category-bite', value: 'bite' },
    { labelKey: 'search-category-restaurant', value: 'restaurant' },
    { labelKey: 'search-category-city', value: 'city' },
    { labelKey: 'search-category-country', value: 'country' },
  ];

  results = input<SearchResult[]>([]);
  selectedCategory = input<SearchCategory>('user');
  selectedCountryCode = input<string>('');
  isLoading = input(false);
  hasSearched = input(false);

  searchTextChange = output<string>();
  categoryChange = output<SearchCategory>();
  countryChange = output<string>();
  resultClick = output<SearchResult>();

  readonly viewMode = signal<'list' | 'map'>('list');
  readonly canShowMap = computed(() => this.selectedCategory() !== 'user');

  /**
   * Drives both the map itself and the page's full-width chrome: on desktop the
   * page column is capped at 720px, which leaves the map as wide as the
   * searchbar. The controls keep that column through their own max-width.
   */
  readonly isMapView = computed(
    () => this.viewMode() === 'map' && this.canShowMap(),
  );

  /**
   * Country is picked from a list, not typed, so the free-text searchbar would
   * only be a dead control here and is swapped for the picker instead.
   */
  readonly isCountrySearch = computed(
    () => this.selectedCategory() === 'country',
  );

  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang?.() || 'en',
  });

  /**
   * Empty until a country is picked; the template supplies the prompt through
   * the Transloco pipe. Translating in here would freeze the first value this
   * computed ever produced, which is the raw key when the catalog has not
   * loaded yet.
   */
  readonly selectedCountryName = computed(() => {
    const countryCode = this.selectedCountryCode();

    return countryCode
      ? getLocalizedCountryName(countryCode, this.activeLang())
      : '';
  });

  readonly selectedCountryFlagClass = computed(() => {
    const countryCode = this.selectedCountryCode();

    return countryCode ? `fi fi-${countryCode.toLowerCase()}` : '';
  });

  readonly mapPositions = computed(() =>
    this.results()
      .filter(
        (result): result is Exclude<SearchResult, { category: 'user' }> =>
          result.category !== 'user' && !!result.value.position,
      )
      .map(
        (result) =>
          ({
            ...result.value.position,
            id: this.getResultId(result),
            // Carries the rating into the marker, so a Bite found through
            // search looks like the same Bite on every other map in the app.
            // Restaurants have no rating of their own and keep the plain pin.
            ...(result.category !== 'restaurant' && result.value.rating
              ? { rating: result.value.rating }
              : {}),
          }) as Geopoint,
      ),
  );

  searchbarInput(event: CustomEvent<SearchbarInputEventDetail>): void {
    this.searchTextChange.emit(event.detail.value ?? '');
  }

  categoryOptions(): ChipRadioOption[] {
    return this.categories.map(({ labelKey, value }) => ({
      label: this.translocoService.translate(labelKey),
      value,
    }));
  }

  categoryValueChange(category: string): void {
    this.categoryChange.emit(category as SearchCategory);
  }

  countrySelected(countryCode: string, modal: IonModal): void {
    this.countryChange.emit(countryCode);
    void modal.dismiss();
  }

  viewModeChange(viewMode: unknown): void {
    if (viewMode === 'list' || viewMode === 'map') {
      this.viewMode.set(viewMode);
    }
  }

  mapMarkerClick(geopoint: Geopoint | undefined): void {
    if (!geopoint?.id) {
      return;
    }

    const result = this.results().find(
      (candidate) => this.getResultId(candidate) === geopoint.id,
    );

    if (result) {
      this.resultClick.emit(result);
    }
  }

  private getResultId(result: SearchResult): string {
    return result.category === 'user'
      ? `${result.category}-${result.value.userId}`
      : `${result.category}-${result.value.id}`;
  }
}
