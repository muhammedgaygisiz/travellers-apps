import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <bt-home
      class="ion-page"
      [bites]="service.sortedHomeBites()"
      [allTags]="service.allTags()"
      [selectedFilters]="service.homeFilters()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showSpinner]="true"
      [isBitesLoading]="service.isBitesLoading()"
      [sorting]="service.sorting()"
      [distance]="service.homeDistance()"
      [preferedCurrency]="service.preferedCurrency()"
      [maxPriceFilter]="service.maxPriceHome()"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [networkStatus]="service.networkStatus()"
      [showEmailVerificationPrompt]="service.emailVerificationPromptVisible()"
      [showFilters]="false"
      showSearchChip
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoSearch)="service.onGotoSearchClick()"
      (openMapView)="service.openMapView('home')"
      (sortingChange)="service.sortingChange($event)"
      (filtersChanged)="service.filtersChanged($event)"
      (filterCleared)="service.filtersCleared()"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
      (rateNowClick)="service.rateNowClicked($event)"
      (resendEmailVerification)="service.resendEmailVerification('home')"
    />

    <bt-coach-mark
      surface="home-feed"
      titleKey="coach-home-feed-title"
      bodyKey="coach-home-feed-body"
      (settled)="feedCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="create-bite"
      titleKey="coach-create-bite-title"
      bodyKey="coach-create-bite-body"
      anchorTestId="footer-add-button"
      [enabled]="feedCoachSettled()"
    />
  `,
  imports: [BiteTribeHomeComponent, CoachMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainer {
  service = inject(HomeService);

  /**
   * Gates the create-Bite coach mark so the two home marks never overlap: it is
   * held back until the feed mark has settled — dismissed, or skipped because it
   * was already seen.
   */
  protected readonly feedCoachSettled = signal(false);

  private hasTrackedPrompt = false;

  private readonly trackPromptEffect = effect(() => {
    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  });

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Home',
    });

    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  }

  ionViewDidLeave(): void {
    this.hasTrackedPrompt = false;
  }

  private trackPromptShownOnce(): void {
    if (this.hasTrackedPrompt) {
      return;
    }

    this.hasTrackedPrompt = true;
    this.service.trackEmailVerificationPromptShown('home');
  }
}
