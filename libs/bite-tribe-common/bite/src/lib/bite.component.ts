import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { ToMetricPipe } from 'distance-pipe';
import { LikesComponent } from './likes/likes.component';
import { ToBlobUrlPipe } from 'image-compression';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-bite',
  templateUrl: './bite.component.html',
  styleUrls: ['./bite.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    ToMetricPipe,
    LikesComponent,
    IonButton,
    ToBlobUrlPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BiteComponent {
  bite = input.required<Bite>();
  userId = input<string>();
  showEditButton = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<{ likeType: string; biteId: string }>();
  gotoEdit = output<Bite>();
}
