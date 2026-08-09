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
      [hasErrorLoadingBites]="service.hasErrorLoadingBites()"
      [locationPermissionState]="service.locationPermissionState()"
      [networkStatus]="service.networkStatus()"
      [showEmailVerificationPrompt]="service.emailVerificationPromptVisible()"
      [emailVerificationResendRunning]="
        service.emailVerificationResendRunning()
      "
      [showFilters]="false"
      [createBitePending]="service.createBitePending()"
      showSearchChip
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
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
      (enableLocation)="service.enableLocation()"
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
      surface="home-menu"
      titleKey="coach-home-menu-title"
      bodyKey="coach-home-menu-body"
      anchorTestId="btn-menu"
      [enabled]="feedCoachSettled()"
      (settled)="menuCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="home-feed-controls"
      titleKey="coach-home-feed-controls-title"
      bodyKey="coach-home-feed-controls-body"
      anchorTestId="home-feed-controls"
      [enabled]="menuCoachSettled()"
      (settled)="feedControlsCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="create-bite"
      titleKey="coach-create-bite-title"
      bodyKey="coach-create-bite-body"
      anchorTestId="footer-add-button"
      [enabled]="feedControlsCoachSettled()"
    />
  `,
  imports: [BiteTribeHomeComponent, CoachMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainer {
  service = inject(HomeService);

  /**
   * Advances the Home coach marks one at a time. A settled mark was either
   * dismissed or skipped because it had already been seen.
   */
  protected readonly feedCoachSettled = signal(false);
  protected readonly menuCoachSettled = signal(false);
  protected readonly feedControlsCoachSettled = signal(false);

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
