import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonAvatar,
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { PageComponent } from 'common/ui/page';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LeaderboardBoard,
  LeaderboardRanking,
  LeaderboardUser,
} from 'bite-tribe/leaderboard-data-access';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The two top-level tabs; the week tab holds both weekly boards. */
export type LeaderboardTab = 'week' | 'allTime';

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
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './leaderboard-list.component.html',
  styleUrl: './leaderboard-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardListComponent {
  private readonly transloco = inject(TranslocoService);

  board = input<LeaderboardBoard>('thisWeek');
  ranking = input<LeaderboardRanking | undefined>(undefined);
  isLoading = input(false);
  /** The moment the countdown is measured from; fixed in stories. */
  now = input<number>(Date.now());

  boardChange = output<LeaderboardBoard>();
  userClick = output<LeaderboardUser>();

  imageErroredUserIds = signal<Set<string>>(new Set());

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  tab = computed<LeaderboardTab>(() =>
    this.board() === 'allTime' ? 'allTime' : 'week',
  );

  /**
   * The ranking on screen. While another board loads, the previous board's
   * users must not be shown under the new tab, so a ranking for a different
   * board reads as empty.
   */
  private readonly shownRanking = computed(() => {
    const ranking = this.ranking();

    return ranking?.board === this.board() ? ranking : undefined;
  });

  rankedUsers = computed(() =>
    [...(this.shownRanking()?.users ?? [])].sort(
      (a, b) => (b.biteCount ?? 0) - (a.biteCount ?? 0),
    ),
  );

  /**
   * "in 2 days" until the reset, or "in 5 hours" on its last day, in the
   * user's language. Empty when the running week's end is not known yet.
   */
  weekEndsIn = computed(() => {
    const end = this.shownRanking()?.end;

    if (this.board() !== 'thisWeek' || !end) {
      return '';
    }

    const remaining = Math.max(end - this.now(), 0);
    // `always`, not `auto`: "tomorrow" names a calendar day in the reader's
    // time zone, while the reset is a moment, Monday 00:00 UTC.
    const format = new Intl.RelativeTimeFormat(this.activeLang(), {
      numeric: 'always',
    });

    return remaining >= DAY_MS
      ? format.format(Math.floor(remaining / DAY_MS), 'day')
      : format.format(Math.max(Math.ceil(remaining / HOUR_MS), 1), 'hour');
  });

  /** "9–15 November" for the frozen last week, in the user's language. */
  lastWeekDates = computed(() => {
    const ranking = this.shownRanking();

    if (this.board() !== 'lastWeek' || !ranking?.start || !ranking.end) {
      return '';
    }

    // `formatRange` writes the range the way each language does ("9–15
    // November", "9.–15. November"). Every supported WebView has it, but the
    // Storybook build's TypeScript lib predates its declaration, hence the
    // local type.
    const format = new Intl.DateTimeFormat(this.activeLang(), {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }) as Intl.DateTimeFormat & {
      formatRange(start: number, end: number): string;
    };

    return format.formatRange(ranking.start, ranking.end - 1);
  });

  emptyKey = computed(() => {
    switch (this.board()) {
      case 'thisWeek':
        return 'leaderboard-empty-this-week';
      case 'lastWeek':
        return 'leaderboard-empty-last-week';
      default:
        return 'no-leaderboard-users-yet';
    }
  });

  selectTab(tab: LeaderboardTab): void {
    this.boardChange.emit(tab === 'allTime' ? 'allTime' : 'thisWeek');
  }

  selectWeek(board: LeaderboardBoard): void {
    this.boardChange.emit(board);
  }

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  hasImage(user: LeaderboardUser): boolean {
    return !!user.photoUrl && !this.imageErroredUserIds().has(user.userId);
  }
}
