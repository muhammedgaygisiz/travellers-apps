import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { OnInit } from '@angular/core';

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
export class TypeaheadComponent implements OnInit {
  @Input() items: any[] = [];
  @Input() selectedItems: string[] = [];
  @Input() title = 'Select Items';

  @Output() selectionCancel = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<string[]>();

  filteredItems: string[] = [];
  workingSelectedValues: string[] = [];

  ngOnInit() {
    this.filteredItems = [...this.items];
    this.workingSelectedValues = [...this.selectedItems];
  }

  cancelChanges() {
    this.selectionCancel.emit();
  }

  confirmChanges() {
    this.selectionChange.emit(this.workingSelectedValues);
  }

  searchbarInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.filterList(inputElement.value);
  }

  /**
   * Update the rendered view with
   * the provided search query. If no
   * query is provided, all data
   * will be rendered.
   */
  filterList(rawSearchTerm: string | undefined) {
    if (!rawSearchTerm) {
      this.filteredItems = this.items;
      return;
    }

    const searchTerm = normalize(rawSearchTerm);
    const allTags = this.items;

    this.filteredItems = allTags.filter((rawTag) => {
      const tag = normalize(rawTag);

      const similarityScore = getSimilarityScore(tag, searchTerm);

      return tag.includes(searchTerm) || similarityScore.length > 0;
    });
  }

  isChecked(value: string): boolean {
    return this.workingSelectedValues.includes(value);
  }

  checkboxChange(event: CustomEvent<{ checked: boolean; value: string }>) {
    const { checked, value } = event.detail;

    if (checked) {
      this.workingSelectedValues = [...this.workingSelectedValues, value];
    } else {
      this.workingSelectedValues = this.workingSelectedValues.filter(
        (item) => item !== value
      );
    }
  }
}
