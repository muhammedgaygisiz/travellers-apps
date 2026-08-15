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
  IonButtons,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonSearchbar,
  IonText,
} from '@ionic/angular/standalone';
import { CountPipe } from '../../pipes/count.pipe';
import { ProgressPipe } from '../../pipes/progress.pipe';
import type { OverlayEventDetail } from '@ionic/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { getSimilarityScore, normalize } from 'utils';

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
    IonProgressBar,
    CountPipe,
    ProgressPipe,
    IonBadge,
    IonAlert,
    IonText,
    IonButton,
    IonButtons,
    IonSearchbar,
    TranslocoPipe,
  ],
})
export class BucketlistsPage {
  private readonly transloco = inject(TranslocoService);

  bucketlists = input<Bucketlist[]>([]);

  gotoBucketlistDetails = output<string>();
  newList = output<string>();
  readonly editBucketlist = output<string>();
  readonly deleteBucketlist = output<string>();
  readonly rateBucketlist = output<string>();

  isAlertOpen = signal<boolean>(false);
  isDeleteAlertOpen = signal<boolean>(false);
  bucketlistToDelete = signal<string | null>(null);

  isSearchVisible = signal(false);
  searchTerm = signal('');

  /**
   * Bucket lists arrive already ordered by name, so the page only has to narrow
   * them down. The sort control this replaced offered a choice nobody needed
   * and rendered a raw translation key while doing it. See GitHub issue #1329.
   */
  filteredBucketlists = computed(() => {
    const bucketlists = this.bucketlists() || [];
    const rawTerm = this.searchTerm();

    if (!rawTerm) {
      return bucketlists;
    }

    const term = normalize(rawTerm);

    return bucketlists.filter((bucketlist) => {
      const name = normalize(bucketlist.name);

      return name.includes(term) || getSimilarityScore(term, name).length > 0;
    });
  });

  toggleSearch(): void {
    this.isSearchVisible.update((visible) => !visible);

    if (!this.isSearchVisible()) {
      this.searchTerm.set('');
    }
  }

  /**
   * Drops the term but keeps the searchbar open, so the empty result can offer
   * its way out without the user having to reopen the search to type the next
   * term. Mirrors the home feed, see GitHub issue #1331.
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm.set(inputElement.value ?? '');
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
