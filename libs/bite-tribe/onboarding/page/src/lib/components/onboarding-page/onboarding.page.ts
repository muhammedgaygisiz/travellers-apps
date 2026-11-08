import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCheckbox,
  IonProgressBar,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { OnboardingStepDefinition } from '../../steps/onboarding-steps';
import { IdentityStepComponent } from '../identity-step/identity-step.component';
import type {
  DisplayNameAvailabilityState,
  OnboardingIdentityDraft,
} from '../identity-step/identity-step.component';
import { VisibilityStepComponent } from '../visibility-step/visibility-step.component';
import { CurrencyStepComponent } from '../currency-step/currency-step.component';
import { LanguageStepComponent } from '../language-step/language-step.component';
import { LocationStepComponent } from '../location-step/location-step.component';
import type { LocationPermissionState } from '../location-step/location-step.component';
import { PhotosStepComponent } from '../photos-step/photos-step.component';
import type { PhotoLocationPermissionState } from '../photos-step/photos-step.component';
import { NotificationStepComponent } from '../notification-step/notification-step.component';
import type { NotificationPermissionState } from '../notification-step/notification-step.component';
import { FinishStepComponent } from '../finish-step/finish-step.component';
import type { FollowSuggestion, PublicUser } from 'model';

/** Room left between a revealed field and the top of the keyboard. */
const FIELD_CLEARANCE_PX = 24;
const FIELD_REVEAL_MS = 200;

/**
 * Presentational onboarding assistant page. It owns the visible step layout and
 * chrome; the container only binds service state and forwards user events.
 */
@Component({
  selector: 'onboarding-page',
  templateUrl: 'onboarding.page.html',
  styleUrl: 'onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The Capacitor Keyboard plugin fires `keyboardWill*` and `keyboardDid*` on
  // window on iOS and Android; Ionic's `ionKeyboardDid*` pair also covers a
  // browser through the visual viewport. The web view itself shrinks on its
  // own schedule, which can be after `keyboardDidShow`, so the resize while
  // the keyboard is up reveals the field too (#1883).
  host: {
    '(window:keyboardWillShow)': 'keyboardOpen.set(true)',
    '(window:keyboardDidShow)': 'revealFocusedField()',
    '(window:ionKeyboardDidShow)': 'revealFocusedField()',
    '(window:resize)': 'keyboardOpen() && revealFocusedField()',
    '(window:keyboardWillHide)': 'keyboardOpen.set(false)',
    '(window:ionKeyboardDidHide)': 'keyboardOpen.set(false)',
  },
  imports: [
    PageComponent,
    IonButton,
    IonCheckbox,
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IdentityStepComponent,
    VisibilityStepComponent,
    CurrencyStepComponent,
    LanguageStepComponent,
    LocationStepComponent,
    PhotosStepComponent,
    NotificationStepComponent,
    FinishStepComponent,
  ],
})
export class OnboardingPage {
  steps = input.required<readonly OnboardingStepDefinition[]>();
  currentIndex = input.required<number>();
  canAdvance = input<boolean>(false);
  isCurrentStepValid = input<boolean>(false);
  profile = input<PublicUser | undefined>();
  displayNameAvailability = input<DisplayNameAvailabilityState>('idle');
  selectedVisibility = input<boolean | null>(false);
  selectedCurrency = input<string>('EUR');
  favoriteCurrencies = input<readonly string[]>([]);
  selectedLanguage = input<string>('en');
  locationPermission = input<LocationPermissionState>('idle');
  homeCity = input<string>('');
  photoLocationPermission = input<PhotoLocationPermissionState>('idle');
  notificationPermission = input<NotificationPermissionState>('idle');
  followSuggestions = input<FollowSuggestion[]>([]);
  followSuggestionsPending = input<ReadonlySet<string>>(new Set());
  followSuggestionsLoading = input(false);

  next = output<void>();
  back = output<void>();
  identityChange = output<OnboardingIdentityDraft>();
  checkDisplayName = output<string>();
  visibilityChange = output<boolean>();
  currencyChange = output<string>();
  favoriteCurrencyToggle = output<string>();
  languageChange = output<string>();
  enableLocation = output<void>();
  skipLocation = output<void>();
  homeCityChange = output<string>();
  enablePhotoLocation = output<void>();
  skipPhotoLocation = output<void>();
  enableNotifications = output<void>();
  skipNotifications = output<void>();
  placeholderValidityChange = output<boolean>();
  followSuggestion = output<FollowSuggestion>();
  followSuggestionsShown = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The on-screen keyboard is up. The app keeps the plugin's default `native`
   * resize, so the web view shrinks to the space above the keyboard and a
   * sticky step navigation would pin itself over the focused input. While it is
   * open the navigation stays in the flow below the step instead (#1883).
   */
  readonly keyboardOpen = signal(false);

  /**
   * Bring the focused field into the space left above the keyboard. Nothing
   * else does - the app turns Ionic's `scrollAssist` off, and WebKit only
   * scrolls the document, never the `ion-content` scroller inside its shadow
   * root - so a field low on a step, such as the home city, otherwise stays
   * under the keyboard until the user scrolls (#1883).
   *
   * It runs on every keyboard and resize signal, and scrolls only by what the
   * field overhangs the visible area, so a call made before the web view has
   * shrunk does nothing and the one after it does the work.
   */
  revealFocusedField(): void {
    this.keyboardOpen.set(true);

    const focused = document.activeElement;
    if (
      !(focused instanceof HTMLElement) ||
      !this.host.nativeElement.contains(focused)
    ) {
      return;
    }

    const field =
      focused.closest<HTMLElement>('ion-input, ion-textarea, ion-searchbar') ??
      focused;
    const visibleBottom = window.visualViewport?.height ?? window.innerHeight;
    const overhang =
      field.getBoundingClientRect().bottom + FIELD_CLEARANCE_PX - visibleBottom;

    if (overhang > 0) {
      void field
        .closest<HTMLIonContentElement>('ion-content')
        ?.scrollByPoint(0, overhang, FIELD_REVEAL_MS);
    }
  }

  readonly stepCount = computed(() => this.steps().length);
  readonly stepNumber = computed(() => this.currentIndex() + 1);
  readonly currentStep = computed(() => this.steps()[this.currentIndex()]);
  readonly isFirstStep = computed(() => this.currentIndex() === 0);
  readonly isLastStep = computed(
    () => this.currentIndex() === this.stepCount() - 1,
  );
  readonly progress = computed(() =>
    this.stepCount() === 0 ? 0 : this.stepNumber() / this.stepCount(),
  );
}
