import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonInput,
  IonButton,
  IonCheckbox,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  template: `
    <ion-content class="ion-padding">
      <h3>Filter by Tags</h3>
      
      <!-- Existing tags section -->
      <ion-list lines="none">
        <h4>Existing Tags</h4>
        @for (tag of existingTags(); track tag) {
        <ion-item>
          <ion-checkbox 
            slot="start" 
            [checked]="selectedTags().includes(tag)"
            (ionChange)="toggleTag(tag)"
          />
          <ion-label>{{ tag }}</ion-label>
        </ion-item>
        }
      </ion-list>

      <!-- Custom tag input -->
      <ion-list>
        <h4>Add Custom Tag</h4>
        <ion-item>
          <ion-input
            [value]="customTagInput()"
            placeholder="Enter custom tag"
            (ionInput)="onCustomTagInputChange($event)"
            (keydown.enter)="addCustomTag()"
          />
          <ion-button 
            slot="end" 
            fill="clear" 
            (click)="addCustomTag()"
            [disabled]="!customTagInput().trim()"
          >
            <ion-icon name="add" />
          </ion-button>
        </ion-item>
      </ion-list>

      <!-- Action buttons -->
      <div class="ion-padding-top">
        <ion-button 
          expand="block" 
          (click)="applyFilters()"
          [disabled]="selectedTags().length === 0"
        >
          Apply Filters ({{ selectedTags().length }})
        </ion-button>
        <ion-button 
          expand="block" 
          fill="outline" 
          (click)="clearFilters()"
        >
          Clear All
        </ion-button>
      </div>
    </ion-content>
  `,
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
export class CustomFilterModalComponent {
  existingTags = input<string[]>([]);
  
  filtersApplied = output<string[]>();
  filtersCleared = output<void>();

  selectedTags = signal<string[]>([]);
  customTagInput = signal<string>('');

  toggleTag(tag: string) {
    const currentTags = this.selectedTags();
    if (currentTags.includes(tag)) {
      this.selectedTags.set(currentTags.filter(t => t !== tag));
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
    this.filtersApplied.emit(this.selectedTags());
  }

  clearFilters() {
    this.selectedTags.set([]);
    this.customTagInput.set('');
    this.filtersCleared.emit();
  }
}