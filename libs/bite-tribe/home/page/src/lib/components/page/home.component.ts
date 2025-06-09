import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonText,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkAutoSizeVirtualScroll } from '@angular/cdk-experimental/scrolling';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    BiteComponent,
    IonCard,
    IonCardContent,
    IonText,
    ScrollingModule,
    CdkAutoSizeVirtualScroll,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  bites = input<any[]>();
  enableBackButton = input<boolean>(false);
  userId = input<string>();
  title = input('Bites');
  editableBites = input(false, { transform: booleanAttribute });
  showFooter = input(true);
  showAddButton = input(true);

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBites = output();
  readonly gotoMyBucketlists = output();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly gotoEdit = output<Bite>();

  trackByBite(index: number, bite: Bite): string {
    return bite.id;
  }
}
