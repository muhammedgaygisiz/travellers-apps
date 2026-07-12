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
  IonSearchbar,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SearchbarInputEventDetail } from '@ionic/core';
import { ChipRadioGroupComponent, type ChipRadioOption } from 'common/ui/chip';
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
    IonSearchbar,
    IonSpinner,
    IonToggle,
    TranslocoPipe,
    ChipRadioGroupComponent,
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
  ];

  results = input<SearchResult[]>([]);
  selectedCategory = input<SearchCategory>('user');
  isLoading = input(false);
  hasSearched = input(false);

  searchTextChange = output<string>();
  categoryChange = output<SearchCategory>();
  resultClick = output<SearchResult>();

  readonly viewMode = signal<'list' | 'map'>('list');
  readonly canShowMap = computed(() => this.selectedCategory() !== 'user');
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
