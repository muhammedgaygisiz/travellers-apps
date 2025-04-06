import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import Filter from '../api/filter';
import addLocationFilter from '../utils/add-location-filter';
import getFilteredPrices from '../utils/get-filtered-prices';
import { CurrencyPipe } from '@angular/common';
import { FilterIconPipe } from '../pipes/filter-icon.pipe';
import { CardComponent } from 'common/ui/card';
import { PageComponent } from 'common/ui/page';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { MostSearchedItem } from '../api/most-searched-item.model';
import { SupportedLang, TranslatePipe } from 'localization';

@Component({
  selector: 'ta-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FilterIconPipe,
    CardComponent,
    PageComponent,
    IonCardHeader,
    IonCardSubtitle,
    IonChip,
    IonLabel,
    IonIcon,
    IonCardTitle,
    IonCardContent,
    TranslatePipe,
  ],
})
export class HomeComponent implements OnChanges {
  @Input()
  mostSearchedEntries: MostSearchedItem[] | null = [];

  @Input()
  isAuthenticated: boolean | null = false;

  @Input()
  location: string | null = '';

  @Output()
  addItemClick = new EventEmitter();

  @Output()
  loginClick = new EventEmitter();

  @Output()
  logoutClick = new EventEmitter();

  @Output()
  languageChangeClick = new EventEmitter<SupportedLang>();

  filters: Filter[] = [];
  filteredPrices: MostSearchedItem[] | null | undefined = [];

  ngOnChanges(changes: SimpleChanges): void {
    const hasLocation = !!changes['location']?.currentValue;

    if (hasLocation) {
      this.filters = addLocationFilter(this.filters, this.location);
    }

    this.applyFilters();
  }

  private applyFilters() {
    this.filteredPrices = this.mostSearchedEntries;

    const hasFilters = this.filters?.length > 0;
    if (hasFilters) {
      this.filteredPrices = getFilteredPrices(
        this.mostSearchedEntries,
        this.filters
      );
    }
  }

  onDeleteFilter(filter: Filter) {
    this.filters = this.filters.filter((curr) => {
      return curr.type !== filter.type && curr.value !== filter.value;
    });

    this.applyFilters();
  }
}
