import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { IonText } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { DistanceComponent } from 'common/distance';
import { LikesComponent } from '../likes/likes.component';

@Component({
  selector: 'bt-compact-bite',
  templateUrl: './compact-bite.component.html',
  styleUrls: ['./compact-bite.component.scss'],
  imports: [LikesComponent, IonText, DistanceComponent, LikesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompactBiteComponent {
  bite = input.required<Bite>();
  userId = input<string>();

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<{ likeType: string; biteId: string }>();

  isOpen = signal(false);
}
