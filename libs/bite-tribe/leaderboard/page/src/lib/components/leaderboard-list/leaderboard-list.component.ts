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
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonThumbnail,
} from '@ionic/angular/standalone';
import { PageComponent } from 'common/ui/page';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LeaderboardBoard,
  LeaderboardRanking,
  LeaderboardUser,
  MostLikedBite,
} from 'bite-tribe/leaderboard-data-access';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The top-level tabs. `week` and `mostLiked` each hold a running and a last
 * week's board, chosen with the week switch.
 */
export type LeaderboardTab = 'week' | 'mostLiked' | 'allTime';

/** The running and the last week's board of each weekly tab. */
const WEEK_BOARDS: Record<
  Exclude<LeaderboardTab, 'allTime'>,
  { current: LeaderboardBoard; last: LeaderboardBoard }
> = {
  week: { current: 'thisWeek', last: 'lastWeek' },
  mostLiked: { current: 'mostLiked', last: 'mostLikedLastWeek' },
};

const LAST_WEEK_BOARDS: readonly LeaderboardBoard[] = [
  'lastWeek',
  'mostLikedLastWeek',
];

@Component({
  selector: 'leaderboard-list',
  standalone: true,
  imports: [
    PageComponent,
    IonAvatar,
    IonBadge,
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonThumbnail,
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
  /** The signed-in user, whose own place is highlighted (#2032). */
  currentUserId = input<string | undefined>(undefined);
  /** The moment the countdown is measured from; fixed in stories. */
  now = input<number>(Date.now());

  boardChange = output<LeaderboardBoard>();
  userClick = output<LeaderboardUser>();
  biteClick = output<MostLikedBite>();
  /** The globe button: open the country ranking (#2043). */
  countriesClick = output<void>();

  imageErroredUserIds = signal<Set<string>>(new Set());

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  tab = computed<LeaderboardTab>(() => {
    const board = this.board();

    if (board === 'allTime') {
      return 'allTime';
    }

    return board === 'mostLiked' || board === 'mostLikedLastWeek'
      ? 'mostLiked'
      : 'week';
  });

  /** The week switch's two values for the tab on screen. */
  weekBoards = computed(() => {
    const tab = this.tab();

    return tab === 'allTime' ? undefined : WEEK_BOARDS[tab];
  });

  private readonly isLastWeek = computed(() =>
    LAST_WEEK_BOARDS.includes(this.board()),
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

  /** The ranked Bites of a Most liked board, in the order stored. */
  rankedBites = computed(() => this.shownRanking()?.bites ?? []);

  /** Whether the board on screen ranks Bites rather than users. */
  ranksBites = computed(() => this.tab() === 'mostLiked');

  isEmpty = computed(() =>
    this.ranksBites()
      ? this.rankedBites().length === 0
      : this.rankedUsers().length === 0,
  );

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

    if (this.tab() === 'allTime' || this.isLastWeek() || !end) {
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

    if (!this.isLastWeek() || !ranking?.start || !ranking.end) {
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

  /**
   * Whether open podium places invite the user to take them: only on the
   * running weeks, the boards a user can still get onto (#2032).
   */
  invitesToPodium = computed(
    () => this.board() === 'thisWeek' || this.board() === 'mostLiked',
  );

  /**
   * The empty text is for a board nobody can join any more, or that has no
   * podium to show: last week and all time. A running week shows its podium
   * with every place open instead.
   */
  showsEmptyText = computed(() => this.isEmpty() && !this.invitesToPodium());

  /**
   * The three podium places in screen order - #2 left, #1 middle, #3 right -
   * each with its entry, if there is one.
   */
  podiumSlots = computed(() => {
    const users = this.ranksBites() ? [] : this.rankedUsers();
    const bites = this.ranksBites() ? this.rankedBites() : [];

    return [2, 1, 3].map((place) => ({
      place,
      user: users[place - 1] as LeaderboardUser | undefined,
      bite: bites[place - 1] as MostLikedBite | undefined,
    }));
  });

  /** Whether a running week still has a podium place free. */
  hasOpenPlace = computed(
    () =>
      this.invitesToPodium() &&
      (this.ranksBites() ? this.rankedBites() : this.rankedUsers()).length < 3,
  );

  /** The places below the podium, 4 to 10. */
  listedUsers = computed(() => this.rankedUsers().slice(3));
  listedBites = computed(() => this.rankedBites().slice(3));

  emptyKey = computed(() => {
    switch (this.board()) {
      case 'thisWeek':
        return 'leaderboard-empty-this-week';
      case 'lastWeek':
        return 'leaderboard-empty-last-week';
      case 'mostLiked':
        return 'leaderboard-empty-most-liked';
      case 'mostLikedLastWeek':
        return 'leaderboard-empty-most-liked-last-week';
      default:
        return 'no-leaderboard-users-yet';
    }
  });

  selectTab(tab: LeaderboardTab): void {
    this.boardChange.emit(
      tab === 'allTime' ? 'allTime' : WEEK_BOARDS[tab].current,
    );
  }

  selectWeek(board: LeaderboardBoard): void {
    this.boardChange.emit(board);
  }

  /** Bite photos that failed to load, by Bite id. */
  imageErroredBiteIds = signal<Set<string>>(new Set());

  onBiteImageError(biteId: string): void {
    this.imageErroredBiteIds.update((set) => new Set([...set, biteId]));
  }

  hasBiteImage(bite: MostLikedBite): boolean {
    return !!bite.imageUrl && !this.imageErroredBiteIds().has(bite.biteId);
  }

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  hasImage(user: LeaderboardUser): boolean {
    return !!user.photoUrl && !this.imageErroredUserIds().has(user.userId);
  }
}
