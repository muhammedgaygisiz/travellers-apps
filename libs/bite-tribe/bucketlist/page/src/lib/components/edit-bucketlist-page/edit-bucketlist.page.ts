import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { OverlayEventDetail } from '@ionic/core';

const DELETE = 'delete';
const CANCEL = 'cancel';

@Component({
  selector: 'edit-bucketlist-page',
  templateUrl: 'edit-bucketlist.page.html',
  styleUrl: 'edit-bucketlist.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonInput,
    IonButton,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonAlert,
    ReactiveFormsModule,
  ],
})
export class EditBucketlistPage {
  private readonly formBuilder = inject(FormBuilder);

  bucketlist = input<Bucketlist | undefined>(undefined);
  bites = input<Bite[]>([]);

  readonly saveTitle = output<string>();
  readonly removeBite = output<RemoveBiteFromBucketlistParams>();

  isRemoveBiteAlertOpen = signal<boolean>(false);
  biteToRemove = signal<string | null>(null);

  titleFormGroup = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
  });

  removeBiteConfirmationButtons = [
    {
      text: 'Cancel',
      role: CANCEL,
    },
    {
      text: 'Delete',
      role: DELETE,
    },
  ];

  setNameControlFromBucketlistInput = effect(() => {
    const name = this.bucketlist()?.name ?? '';
    this.titleFormGroup.patchValue({ name });
  });

  onSaveTitle(): void {
    if (!this.titleFormGroup.valid) {
      return;
    }
    const name = this.titleFormGroup.value.name;

    if (!name) {
      return;
    }

    this.saveTitle.emit(name);
  }

  openRemoveBiteConfirmation(biteId: string, event: Event): void {
    event.stopPropagation();
    this.biteToRemove.set(biteId);
    this.isRemoveBiteAlertOpen.set(true);
  }

  handleRemoveBiteDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === DELETE) {
      const biteId = this.biteToRemove();
      const bucketlistId = this.bucketlist()?.id;
      if (biteId && bucketlistId) {
        this.removeBite.emit({ biteId, bucketlistId });
      }
    }

    this.isRemoveBiteAlertOpen.set(false);
    this.biteToRemove.set(null);
  }
}
