import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
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
        <ion-item [detail]="false" (click)="onNewList()">
          <ion-icon slot="start" name="add-circle-outline" />
          Create New List
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonContent, IsInPipe],
})
export class BucketListSelectionComponent {
  bucketLists = input<Bucketlist[]>([]);
  bite = input<Bite>();

  selectList = output<Bucketlist>();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onNewList = () => {};
}
