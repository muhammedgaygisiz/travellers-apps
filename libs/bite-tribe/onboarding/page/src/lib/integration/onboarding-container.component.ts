import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FollowSuggestionsService } from 'bite-tribe/follow-suggestions-data-access';
import { OnboardingPage } from '../components/onboarding-page/onboarding.page';
import { OnboardingService } from './onboarding.service';

/**
 * Binds onboarding service state to the presentational page and routes page
 * events back into the service.
 */
@Component({
  selector: 'onboarding-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<onboarding-page
    class="ion-page"
    [steps]="service.steps()"
    [currentIndex]="service.currentIndex()"
    [canAdvance]="service.canAdvance()"
    [isCurrentStepValid]="service.isCurrentStepValid()"
    [profile]="service.profile()"
    [displayNameAvailability]="service.displayNameAvailability()"
    [selectedVisibility]="service.selectedVisibility()"
    [selectedCurrency]="service.selectedCurrency()"
    [favoriteCurrencies]="service.favoriteCurrencies()"
    [selectedLanguage]="service.selectedLanguage()"
    [locationPermission]="service.locationPermission()"
    [homeCity]="service.homeCity()"
    [photoLocationPermission]="service.photoLocationPermission()"
    [notificationPermission]="service.notificationPermission()"
    [followSuggestions]="followSuggestions.suggestions()"
    [followSuggestionsPending]="followSuggestions.pendingIds()"
    [followSuggestionsLoading]="followSuggestions.isLoading()"
    (next)="service.next()"
    (back)="service.back()"
    (identityChange)="service.updateIdentity($event)"
    (checkDisplayName)="service.checkDisplayNameAvailability($event)"
    (visibilityChange)="service.updateVisibility($event)"
    (currencyChange)="service.updateCurrency($event)"
    (favoriteCurrencyToggle)="service.toggleFavoriteCurrency($event)"
    (languageChange)="service.updateLanguage($event)"
    (enableLocation)="service.requestLocation()"
    (skipLocation)="service.skipLocation()"
    (homeCityChange)="service.updateHomeCity($event)"
    (enablePhotoLocation)="service.requestPhotoLocation()"
    (skipPhotoLocation)="service.skipPhotoLocation()"
    (enableNotifications)="service.requestNotifications()"
    (skipNotifications)="service.skipNotifications()"
    (placeholderValidityChange)="service.setCurrentStepValid($event)"
    (followSuggestion)="followSuggestions.follow($event, 'onboarding')"
    (followSuggestionsShown)="
      followSuggestions.trackShown('onboarding', $event)
    "
  />`,
  imports: [OnboardingPage],
})
export class OnboardingContainerComponent {
  service = inject(OnboardingService);
  followSuggestions = inject(FollowSuggestionsService);

  constructor() {
    // Asked for on reaching the finish step rather than on entry, so a user
    // who never gets that far costs no call (issue #1708).
    effect(() => {
      if (this.service.currentStep()?.id === 'finish') {
        this.followSuggestions.request();
      }
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.service.initialize();
  }

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Onboarding',
    });
  }
}
