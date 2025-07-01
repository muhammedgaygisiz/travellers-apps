import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  templateUrl: './custom-filter-modal.component.html',
  styleUrl: './custom-filter-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonInput,
    IonButton,
    IonCheckbox,
    IonLabel,
  ],
})
export class CustomFilterModalComponent implements OnInit {
  data: {
    existingTags: string[];
    selectedFilters: string[];
  } = inject(DIALOG_DATA);

  dialogRef = inject(
    DialogRef<{
      selectedTags?: string[];
      clearFilters?: boolean;
    }>
  );

  selectedTags = signal<string[]>([]);
  customTagInput = signal<string>('');

  // Initialize selected tags when modal opens
  ngOnInit() {
    this.selectedTags.set([...this.data.selectedFilters]);
  }

  // Filter tags based on search input
  filteredTags = computed(() => {
    const searchTerm = this.customTagInput().toLowerCase().trim();
    const allTags = this.data.existingTags;

    if (!searchTerm) {
      return allTags;
    }

    return allTags.filter((tag) => tag.toLowerCase().includes(searchTerm));
  });

  toggleTag(tag: string) {
    const currentTags = this.selectedTags();
    if (currentTags.includes(tag)) {
      this.selectedTags.set(currentTags.filter((t) => t !== tag));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }
  }

  onCustomTagInputChange(event: any) {
    this.customTagInput.set(event.target.value);
  }

  addCustomTag() {
    const customTag = this.customTagInput().trim();
    if (customTag && !this.selectedTags().includes(customTag)) {
      this.selectedTags.set([...this.selectedTags(), customTag]);
      this.customTagInput.set('');
    }
  }

  applyFilters() {
    this.dialogRef.close({ selectedTags: this.selectedTags() });
  }

  clearFilters() {
    this.selectedTags.set([]);
    this.customTagInput.set('');
    this.dialogRef.close({ clearFilters: true });
  }
}
