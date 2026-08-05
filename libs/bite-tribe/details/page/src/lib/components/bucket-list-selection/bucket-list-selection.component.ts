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
          class="cursor-pointer"
          (click)="requestNewList()"
        >
          <ion-icon slot="start" name="add-outline" />
          New Bucket list
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonContent, GetBucketlistIconPipe],
})
export class BucketListSelectionComponent {
  bucketLists = input<Bucketlist[]>([]);
  bite = input<Bite>();

  selectList = output<Bucketlist>();

  /**
   * Asking for the new list's name is delegated to the page that opened this
   * popover, which replaces this no-op through the popover's `componentProps`.
   *
   * The prompt cannot live in this template: the popover is created with
   * `dismissOnSelect`, so the same tap that asks for a new list also dismisses
   * the popover, and Ionic destroys this component — together with any overlay
   * declared inside it — as part of that dismissal. See GitHub issue #1231.
   */
  requestNewList: () => void = () => undefined;

  removeBiteFromBucketlist = output<RemoveBiteFromBucketlistParams>();

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
