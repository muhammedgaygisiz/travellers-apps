import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRange,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { getSimilarityScore, normalize } from 'utils';
import { IsCheckedPipe } from './pipes/is-checked.pipe';

@Component({
  selector: 'app-type-ahead',
  templateUrl: 'type-ahead.component.html',
  styleUrl: 'type-ahead.component.scss',
  imports: [
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    IonInput,
    IonRange,
    IsCheckedPipe,
    IonLabel,
    IonFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeaheadComponent {
  items = input<string[]>([]);

  selectedItems = input<string[]>([]);

  title = input('Select Items');

  distance = input<number>();

  currency = input('EUR');

  price = input(0);

  selectionCancel = output<void>();
  selectionChange = output<{
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }>();

  clearFilters = output<void>();

  rawSearchTerm = signal('');
  distanceValue = linkedSignal(() => {
    const distance = this.distance();

    if (distance) {
      return `${distance}`;
    }

    return '';
  });

  priceValue = linkedSignal(() => {
    const price = this.price();

    if (price) {
      return price;
    }

    return 0;
  });

  filteredItems = computed(() => {
    const items = this.items();
    const rawSearchTerm = this.rawSearchTerm();

    if (!rawSearchTerm) {
      return items;
    }

    const searchTerm = normalize(rawSearchTerm);
    const allTags = this.items();

    return allTags.filter((rawTag) => {
      const tag = normalize(rawTag);

      const similarityScore = getSimilarityScore(tag, searchTerm);

      return tag.includes(searchTerm) || similarityScore.length > 0;
    });
  });

  workingSelectedValues = signal<string[]>([]);

  initWorkingSelectedValues = effect(() => {
    const selectedItems = this.selectedItems();

    this.workingSelectedValues.set(selectedItems);
  });

  cancelChanges(): void {
    this.selectionCancel.emit();
  }

  clearAllFilters(): void {
    this.clearFilters.emit();
  }

  confirmChanges(): void {
    this.selectionChange.emit({
      tagFilters: this.workingSelectedValues(),
      distanceFilter: this.distanceValue(),
      priceFilter: this.priceValue(),
    });
  }

  searchbarInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    this.rawSearchTerm.set(inputElement.value);
  }

  isChecked(value: string): boolean {
    return this.workingSelectedValues().includes(value);
  }

  checkboxChange(
    event: CustomEvent<{ checked: boolean; value: string }>
  ): void {
    const { checked, value } = event.detail;

    if (checked) {
      this.workingSelectedValues.update((curr) => [...curr, value]);
    } else {
      this.workingSelectedValues.update((curr) =>
        curr.filter((item) => item !== value)
      );
    }
  }

  distanceInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    this.distanceValue.set(inputElement.value);
  }

  priceInput(event: CustomEvent): void {
    const inputElement = event.target as HTMLInputElement;

    this.priceValue.set(+inputElement.value);
  }
}
