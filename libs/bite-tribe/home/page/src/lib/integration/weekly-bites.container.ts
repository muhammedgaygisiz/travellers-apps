import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';

/**
 * Landing page for the weekly bite summary notification.
 *
 * The notification announces how many bites the tribe shared in one specific
 * week, so tapping it must land on those bites rather than on the home feed
 * (issue #1054). The week travels in the deep link; the backend falls back to
 * the previous calendar week when it is missing.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [title]="pageTitle()"
      [showFooter]="false"
      [showAddButton]="false"
      [enableBackButton]="true"
      [bites]="service.weeklyBites()"
      [userId]="service.userId()"
      [showHeaderMenu]="false"
      [showSpinner]="true"
      [isBitesLoading]="service.weeklyBitesLoading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [sorting]="service.weeklyBitesSorting()"
      [showMap]="false"
      [showFilters]="false"
      showSearch
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (menuNavigate)="service.onMenuNavigate($event)"
      (sortingChange)="service.weeklyBitesSortingChange($event)"
      (refresh)="service.reloadWeeklyBites()"
      (closeGpsError)="service.closeGpsError()"
      (enableLocation)="service.enableLocation()"
      (rateNowClick)="service.rateNowClicked($event)"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class WeeklyBitesContainer {
  service = inject(HomeService);

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  /**
   * The page name plus the week it is showing, e.g. "Bites of the week ·
   * 14 – 20 Jul". The range is appended only once the backend has answered,
   * because before that we do not know which week the deep link resolved to.
   */
  pageTitle = computed(() => {
    const title = this.transloco.translate('weekly-bites');
    const range = this.service.weeklyBitesRange();

    if (!range) {
      return title;
    }

    return `${title} · ${formatWeekRange(range, this.activeLang())}`;
  });

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Weekly Bites',
    });
  }
}

/**
 * The weekly summary is anchored to Europe/Zurich: the job runs on Zurich time
 * and the bounds it reports are Zurich midnights. Rendering them in the device
 * timezone would move the labelled days off the week that was actually counted,
 * so the label is formatted in the same zone that defines it.
 */
const WEEK_LABEL_TZ = 'Europe/Zurich';

const formatWeekRange = (
  range: { weekStart: number; weekEnd: number },
  lang: string,
): string => {
  const formatter = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    timeZone: WEEK_LABEL_TZ,
  });

  return `${formatter.format(new Date(range.weekStart))} – ${formatter.format(
    new Date(range.weekEnd),
  )}`;
};
