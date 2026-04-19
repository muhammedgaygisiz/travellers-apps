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
import { Bucketlist } from 'model';
import {
  IonAlert,
  IonBadge,
  IonButton,
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
import type { OverlayEventDetail } from '@ionic/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

const DELETE = 'delete';
const CANCEL = 'cancel';

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
    IonButton,
    TranslocoPipe,
  ],
})
export class BucketlistsPage {
  private readonly transloco = inject(TranslocoService);

  bucketlists = input<Bucketlist[]>([]);
  sorting = input<string>('name');
  sortingLabel = computed(() => {
    const sorting = this.sorting();
    switch (sorting) {
      case 'name':
        return this.transloco.translate('name');
      case 'createdAt':
        return this.transloco.translate('date');
      default:
        return this.transloco.translate('name');
    }
  });

  gotoBucketlistDetails = output<string>();
  newList = output<string>();
  readonly sortingChange = output<string>();
  readonly editBucketlist = output<string>();
  readonly deleteBucketlist = output<string>();
  readonly rateBucketlist = output<string>();

  isAlertOpen = signal<boolean>(false);
  isDeleteAlertOpen = signal<boolean>(false);
  bucketlistToDelete = signal<string | null>(null);

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

  deleteConfirmationButtons = [
    {
      text: this.transloco.translate('cancel'),
      role: CANCEL,
    },
    {
      text: this.transloco.translate('delete'),
      role: DELETE,
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

  openDeleteConfirmation(bucketlistId: string, event: Event): void {
    event.stopPropagation();
    this.bucketlistToDelete.set(bucketlistId);
    this.isDeleteAlertOpen.set(true);
  }

  handleDeleteConfirmationDismiss(
    event: CustomEvent<OverlayEventDetail>,
  ): void {
    const role = event.detail.role;

    if (role === DELETE) {
      const id = this.bucketlistToDelete();
      if (id) {
        this.deleteBucketlist.emit(id);
      }
    }

    this.isDeleteAlertOpen.set(false);
    this.bucketlistToDelete.set(null);
  }

  onEditBucketlist(bucketlistId: string, event: Event): void {
    event.stopPropagation();
    this.editBucketlist.emit(bucketlistId);
  }

  onRateBucketlist(bucketlistId: string, event: Event): void {
    event.stopPropagation();
    this.rateBucketlist.emit(bucketlistId);
  }
}
