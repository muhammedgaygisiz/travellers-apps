import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bucketlist } from 'model';
import {
  IonAlert,
  IonBadge,
  IonChip,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { CountPipe } from '../../pipes/count.pipe';

@Component({
  selector: 'bucketlists-page',
  templateUrl: 'bucketlists.page.html',
  styleUrl: 'bucketlists.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonList,
    IonItem,
    IonLabel,
    IonContent,
    IonIcon,
    CountPipe,
    IonBadge,
    IonAlert,
    IonChip,
    IonSelect,
    IonSelectOption,
    IonText,
  ],
})
export class BucketlistsPage {
  bucketlists = input<Bucketlist[]>([]);
  title = input('My Bucketlists');
  sorting = input<string>('name');
  sortingLabel = computed(() => {
    const sorting = this.sorting();
    switch (sorting) {
      case 'name':
        return 'Name';
      case 'createdAt':
        return 'Date';
      default:
        return 'Name';
    }
  });

  gotoBucketlistDetails = output<string>();
  newList = output<string>();
  readonly sortingChange = output<string>();

  isAlertOpen = signal<boolean>(false);

  emitSortingChange(event: { detail: { value: string } }): void {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }

  newListInputs = [
    {
      placeholder: 'Name',
    },
  ];

  saveButton = [
    {
      text: 'Save',
      handler: this.onNewList.bind(this),
    },
    {
      text: 'Cancel',
      handler: this.onCancel.bind(this),
    },
  ];

  onCancel(): void {
    this.isAlertOpen.set(false);
  }

  onNewList(alertResult: string[]): void {
    const newListName = alertResult[0];

    if (!newListName?.trim()) return;

    this.isAlertOpen.set(false);
    this.newList.emit(newListName);
  }

  openAlert(): void {
    this.isAlertOpen.set(true);
  }
}
