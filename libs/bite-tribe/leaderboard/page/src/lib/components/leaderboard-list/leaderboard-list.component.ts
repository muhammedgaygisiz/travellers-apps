import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import { PageComponent } from 'common/ui/page';
import { TranslocoPipe } from '@jsverse/transloco';
import { LeaderboardUser } from 'bite-tribe/leaderboard-data-access';

@Component({
  selector: 'leaderboard-list',
  standalone: true,
  imports: [
    PageComponent,
    IonAvatar,
    IonBadge,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './leaderboard-list.component.html',
  styleUrl: './leaderboard-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardListComponent {
  users = input<LeaderboardUser[]>([]);
  isLoading = input(false);

  userClick = output<LeaderboardUser>();

  imageErroredUserIds = signal<Set<string>>(new Set());

  rankedUsers = computed(() =>
    [...(this.users() ?? [])].sort(
      (a, b) => (b.biteCount ?? 0) - (a.biteCount ?? 0),
    ),
  );

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  hasImage(user: LeaderboardUser): boolean {
    return !!user.photoUrl && !this.imageErroredUserIds().has(user.userId);
  }
}
