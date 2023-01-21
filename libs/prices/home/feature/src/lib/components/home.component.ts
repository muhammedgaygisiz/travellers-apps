import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MostSearchedItem } from '@travellers-apps/utils-common';
import Filter from '../model/filter';
import addLocationFilter from '../utils/add-location-filter';
import getFilteredPrices from '../utils/get-filtered-prices';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { IonicModule } from '@ionic/angular';
import { CurrencyPipe, NgForOf, NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'ta-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageFeatureModule,
    CardFeatureModule,
    IonicModule,
    NgForOf,
    CurrencyPipe,
    NgIf,
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
  addItemClick: EventEmitter<void> = new EventEmitter();

  @Output()
  loginClick: EventEmitter<void> = new EventEmitter();

  @Output()
  logoutClick: EventEmitter<void> = new EventEmitter();

  filters: Filter[] = [];
  filteredPrices: MostSearchedItem[] | null | undefined = [];

  ngOnChanges(changes: SimpleChanges): void {
    const hasLocation = !!changes['location']?.currentValue;

    if (hasLocation) {
      this.filters = addLocationFilter(this.filters, this.location);
    }

    this.applyFilters();
  }

  by(index: number) {
    return index;
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
