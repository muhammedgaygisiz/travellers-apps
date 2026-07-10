import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SearchbarInputEventDetail } from '@ionic/core';
import { ChipRadioGroupComponent, type ChipRadioOption } from 'common/ui/chip';
import type { SearchCategory, SearchResult } from 'model';
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
    IonSearchbar,
    TranslocoPipe,
    ChipRadioGroupComponent,
    SearchListComponent,
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
}
