import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { getLocalizedCountryName } from 'utils';
import type {
  CountryBoard,
  CountryRanking,
  RankedCountry,
} from 'bite-tribe/leaderboard-data-access';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A ranked country with what its row and podium place show. */
interface CountryEntry extends RankedCountry {
  rank: number;
  name: string;
  flagClass: string;
}

/**
 * The country ranking (issue #2043): countries by the Bites posted in them,
 * this week (with last week frozen beside it) or all time, the top 3 on the
 * podium of #2032 with their flags. It shows only countries and counts.
 */
@Component({
  selector: 'country-leaderboard',
  standalone: true,
  imports: [
    PageComponent,
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
  templateUrl: './country-leaderboard.component.html',
  styleUrl: './country-leaderboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryLeaderboardComponent {
  private readonly transloco = inject(TranslocoService);

  board = input<CountryBoard>('countries');
  ranking = input<CountryRanking | undefined>(undefined);
  isLoading = input(false);
  /** The moment the countdown is measured from; fixed in stories. */
  now = input<number>(Date.now());

  boardChange = output<CountryBoard>();
  countryClick = output<string>();

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  tab = computed(() =>
    this.board() === 'countriesAllTime' ? 'allTime' : 'week',
  );

  /** A ranking for another board than the one on screen reads as empty. */
  private readonly shown = computed(() => {
    const ranking = this.ranking();

    return ranking?.board === this.board() ? ranking : undefined;
  });

  entries = computed<CountryEntry[]>(() =>
    (this.shown()?.countries ?? []).map((country, index) => ({
      ...country,
      rank: index + 1,
      name: getLocalizedCountryName(country.countryCode, this.activeLang()),
      flagClass: `fi fi-${country.countryCode.toLowerCase()}`,
    })),
  );

  /** The podium places in screen order: #2 left, #1 middle, #3 right. */
  podiumSlots = computed(() =>
    [2, 1, 3].map((place) => ({
      place,
      entry: this.entries()[place - 1] as CountryEntry | undefined,
    })),
  );

  listed = computed(() => this.entries().slice(3));

  weekEndsIn = computed(() => {
    const end = this.shown()?.end;

    if (this.board() !== 'countries' || !end) {
      return '';
    }

    const remaining = Math.max(end - this.now(), 0);
    const format = new Intl.RelativeTimeFormat(this.activeLang(), {
      numeric: 'always',
    });

    return remaining >= DAY_MS
      ? format.format(Math.floor(remaining / DAY_MS), 'day')
      : format.format(Math.max(Math.ceil(remaining / HOUR_MS), 1), 'hour');
  });

  lastWeekDates = computed(() => {
    const ranking = this.shown();

    if (
      this.board() !== 'countriesLastWeek' ||
      !ranking?.start ||
      !ranking.end
    ) {
      return '';
    }

    // See the leaderboard list: the Storybook TypeScript lib predates the
    // declaration of `formatRange`, which every supported WebView has.
    const format = new Intl.DateTimeFormat(this.activeLang(), {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }) as Intl.DateTimeFormat & {
      formatRange(start: number, end: number): string;
    };

    return format.formatRange(ranking.start, ranking.end - 1);
  });

  emptyKey = computed(() =>
    this.board() === 'countries'
      ? 'leaderboard-empty-this-week'
      : this.board() === 'countriesLastWeek'
        ? 'leaderboard-empty-last-week'
        : 'no-leaderboard-users-yet',
  );

  selectTab(tab: 'week' | 'allTime'): void {
    this.boardChange.emit(tab === 'allTime' ? 'countriesAllTime' : 'countries');
  }

  selectWeek(board: CountryBoard): void {
    this.boardChange.emit(board);
  }
}
