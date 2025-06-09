import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bucketlist } from 'model';
import {
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { CountPipe } from '../../pipes/count.pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
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
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BucketlistsPage {
  bucketlists = input<Bucketlist[]>([]);
}
