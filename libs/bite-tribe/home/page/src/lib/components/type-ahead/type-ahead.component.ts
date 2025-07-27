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
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonRange,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { getSimilarityScore, normalize } from 'utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeaheadComponent {
  items = input<string[]>([]);

  selectedItems = input<string[]>([]);

  title = input('Select Items');

  selectionCancel = output<void>();
  selectionChange = output<string[]>();

  rawSearchTerm = signal('');

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

  cancelChanges() {
    this.selectionCancel.emit();
  }

  confirmChanges() {
    this.selectionChange.emit(this.workingSelectedValues());
  }

  searchbarInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    this.rawSearchTerm.set(inputElement.value);
  }

  isChecked(value: string): boolean {
    return this.workingSelectedValues().includes(value);
  }

  checkboxChange(event: CustomEvent<{ checked: boolean; value: string }>) {
    const { checked, value } = event.detail;

    if (checked) {
      this.workingSelectedValues.update((curr) => [...curr, value]);
    } else {
      this.workingSelectedValues.update((curr) =>
        curr.filter((item) => item !== value)
      );
    }
  }
}
