import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import { GetBucketlistIconPipe } from '../../pipes/get-bucketlist-icon.pipe';

@Component({
  template: `
    <ion-content class="ion-no-padding">
      <ion-list lines="none">
        @for (bucketList of bucketLists(); track bucketList) {
          <ion-item [detail]="false" (click)="onBucketlistSelected(bucketList)">
            <ion-icon
              slot="start"
              [name]="bite() | getBucketlistIcon: bucketList"
            />
            {{ bucketList.name }}
          </ion-item>
        }
        <ion-item
          [detail]="false"
          id="preset-new-list-alert"
          class="cursor-pointer"
        >
          <ion-icon slot="start" name="add-outline" />
          New Bucket list
        </ion-item>
        <ion-alert
          trigger="preset-new-list-alert"
          header="Please enter a name for your new list"
          [inputs]="newListInputs"
          [buttons]="saveButton"
        />
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonList,
    IonItem,
    IonIcon,
    IonContent,
    GetBucketlistIconPipe,
    IonAlert,
  ],
})
export class BucketListSelectionComponent {
  bucketLists = input<Bucketlist[]>([]);
  bite = input<Bite>();

  selectList = output<Bucketlist>();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onNewList = (newListName: string): void => {};

  removeBiteFromBucketlist = output<RemoveBiteFromBucketlistParams>();

  public saveButton = [
    {
      text: 'Save',
      handler: this.onAlertDidDismiss.bind(this),
    },
    'Cancel',
  ];

  public newListInputs = [
    {
      placeholder: 'Name',
    },
  ];

  onAlertDidDismiss($event: any): void {
    const newListName = $event[0];
    this.onNewList(newListName);
  }

  onBucketlistSelected(bucketList: Bucketlist): void {
    const bite = this.bite();
    if (bite && bucketList.biteIds?.includes(bite.id)) {
      this.removeBiteFromBucketlist.emit({
        bucketlistId: bucketList.id,
        biteId: bite.id,
      });
      return;
    }

    this.selectList.emit(bucketList);
  }
}
