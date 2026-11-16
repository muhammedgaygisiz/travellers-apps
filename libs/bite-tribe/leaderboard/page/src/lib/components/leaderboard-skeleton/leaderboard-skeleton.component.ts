import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonItem,
  IonLabel,
  IonList,
  IonSkeletonText,
} from '@ionic/angular/standalone';

/**
 * The shape of a ranking while it loads for the first time (issue #2081): the
 * podium with three empty places and the rows below it. A refresh of a ranking
 * already on screen keeps the ranking instead.
 */
@Component({
  selector: 'leaderboard-skeleton',
  standalone: true,
  imports: [IonItem, IonLabel, IonList, IonSkeletonText],
  templateUrl: './leaderboard-skeleton.component.html',
  styleUrl: './leaderboard-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardSkeletonComponent {
  readonly podiumPlaces = [2, 1, 3];
  readonly rows = [4, 5, 6, 7];
}
