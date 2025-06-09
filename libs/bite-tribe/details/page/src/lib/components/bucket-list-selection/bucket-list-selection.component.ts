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
import { Bite, Bucketlist } from 'model';
import { IsInPipe } from '../../pipes/is-in.pipe';

@Component({
  template: `
    <ion-content class="ion-no-padding">
      <ion-list lines="none">
        @for (bucketList of bucketLists(); track bucketList) {
        <ion-item [detail]="false" (click)="selectList.emit(bucketList)">
          <ion-icon slot="start" [name]="bite() | isIn : bucketList" />
          {{ bucketList.name }}
        </ion-item>
        }
        <ion-item [detail]="false" id="preset-new-list-alert">
          <ion-icon slot="start" name="add-circle-outline" />
          Create New List
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
  imports: [IonList, IonItem, IonIcon, IonContent, IsInPipe, IonAlert],
})
export class BucketListSelectionComponent {
  bucketLists = input<Bucketlist[]>([]);
  bite = input<Bite>();

  selectList = output<Bucketlist>();
  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-unused-vars
  onNewList = (newListName: string) => {};

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

  onAlertDidDismiss($event: any) {
    const newListName = $event[0];
    this.onNewList(newListName);
  }
}
