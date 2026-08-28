import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToggle,
} from '@ionic/angular/standalone';
import { CurrencySelectorComponent } from 'currency-selector';
import { PublicUser, Settings } from 'model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { currencyCodes } from 'utils';
import { User } from '@capacitor-firebase/authentication';
import { CardComponent } from 'common/ui/card';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PushPermissionState } from 'push-notifications';

/**
 * One registered app installation, as the settings list shows it.
 *
 * `label` and `details` are already resolved: the raw FCM token is a delivery
 * address, not something a user can recognise, so it never reaches the UI as a
 * label (issue #1184).
 */
export interface PushInstallationView {
  /** FCM token; the identity the enable switch writes against. */
  token: string;
  /** Device label, or empty for a legacy token with no installation metadata. */
  label: string;
  /** Secondary line, e.g. `iOS 26.5 · 1.0.1 (88)`. */
  details: string;
  enabled: boolean;
  isCurrentDevice: boolean;
}

@Component({
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonCard,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    ReactiveFormsModule,
    IonModal,
    CurrencySelectorComponent,
    IonText,
    CardComponent,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonNote,
    IonSpinner,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSettings {
  user = input<User | null | undefined>();
  publicUser = input<PublicUser>();
  settings = input<Settings>();
  showEmailVerificationPrompt = input(false);
  emailVerificationResendRunning = input(false);

  /** Registered installations of the signed-in user, most recent first. */
  pushInstallations = input<readonly PushInstallationView[]>([]);
  /** OS notification permission of this device only. */
  pushPermission = input<PushPermissionState>('prompt');
  pushInstallationsLoading = input(false);
  /** Whether the current-device setup action is waiting on the OS or Firestore. */
  pushSetupRunning = input(false);

  submitSettings = output<Settings>();
  logout = output<void>();
  resendEmailVerification = output<void>();
  deleteAccount = output<void>();
  togglePushInstallation = output<{ token: string; enabled: boolean }>();
  /**
   * Register this device, or bring a muted one back.
   *
   * `token` is present only when the request came from an installation's own
   * switch, so a device the user had turned off in BiteTribe comes back on
   * together with the OS permission it is waiting for (issue #1386).
   */
  enablePushOnThisDevice = output<{ token?: string }>();
  openPushSettings = output<void>();

  private readonly formBuilder = inject(FormBuilder);

  currencies = currencyCodes;

  settingsForm = this.formBuilder.nonNullable.group({
    emailUpdates: [{ value: false, disabled: true }, Validators.required],
    theme: ['light', Validators.required],
    currency: ['EUR', Validators.required],
    favoriteCurrencies: [[] as string[]],
    language: ['en', Validators.required],
  });

  settingsEffect = afterRenderEffect(() => {
    const settings = this.settings();

    if (settings) {
      // patchValue ignores keys without a matching control (e.g. updatedAt).
      this.settingsForm.patchValue(settings);
    }
  });

  systemTheme = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  systemLanguage = signal(navigator.language || navigator.languages[0] || 'en');

  themeEffect = effect(() => {
    const systemTheme = this.systemTheme();

    this.settingsForm.patchValue({ theme: systemTheme });
  });

  currencyValueChanges = toSignal(
    this.settingsForm.controls['currency'].valueChanges,
  );

  selectedCurrencyName = computed(() => {
    this.currencyValueChanges();
    const currencyCode = this.settingsForm.controls['currency'].value;
    return this.currencies.find((c) => c.code === currencyCode)?.name;
  });

  favoriteCurrenciesValueChanges = toSignal(
    this.settingsForm.controls['favoriteCurrencies'].valueChanges,
  );

  favoriteCurrencyNames = computed(() => {
    this.favoriteCurrenciesValueChanges();
    const favoriteCurrencyCodes =
      this.settingsForm.controls['favoriteCurrencies'].value;

    return favoriteCurrencyCodes
      .map((currencyCode) => {
        return this.currencies.find(
          (currency) => currency.code === currencyCode,
        )?.name;
      })
      .filter((currencyName): currencyName is string => !!currencyName)
      .join(', ');
  });

  subscriptionTier = computed(() => {
    const user = this.publicUser();
    return user?.subscriptionTier ?? 0;
  });

  isFreeUser = computed(() => this.subscriptionTier() === 0);
  isProUser = computed(() => this.subscriptionTier() >= 1);

  /**
   * Whether this platform can receive push at all.
   *
   * This gates only the current-device parts of the section. The installation
   * list is account data and stays manageable from anywhere the user is signed
   * in — a browser that cannot receive notifications itself must still be able
   * to turn delivery off for a phone that can.
   */
  pushSupported = computed(() => this.pushPermission() !== 'unsupported');

  /**
   * Whether the OS is dropping delivery for this device.
   *
   * Anything short of a grant mutes it, not only an outright denial: Android
   * returns a revoked `POST_NOTIFICATIONS` to an unspent prompt, and reading
   * that as "not decided yet" is what left a registered device showing its
   * switch on while nothing could arrive (issue #1386).
   */
  private readonly osMutesThisDevice = computed(
    () => this.pushSupported() && this.pushPermission() !== 'granted',
  );

  /**
   * Whether the OS prompt can still be spent, and the dialog is therefore the
   * shortest route back. Once it is gone the system settings page is the only
   * one left.
   */
  canRequestPushPermission = computed(() => this.pushPermission() === 'prompt');

  hasCurrentInstallation = computed(() =>
    this.pushInstallations().some(
      (installation) => installation.isCurrentDevice,
    ),
  );

  /**
   * The intro copy explains the list, so it only appears with one. Offering
   * "choose which of your devices" above an empty list promises a choice that
   * is not there.
   */
  showInstallationsCopy = computed(() => this.pushInstallations().length > 0);

  /**
   * Whether the empty list is worth stating.
   *
   * Where push is unsupported, "notifications are not available on this device"
   * already accounts for the empty list; repeating it adds a second line that
   * says nothing new.
   */
  showNoInstallationsNote = this.pushSupported;

  /**
   * The setup action only makes sense while this device has no token and the OS
   * prompt can still be answered. Once denied, the only route back is the
   * system settings page, so the recovery action takes its place.
   */
  showPushSetup = computed(
    () =>
      this.pushSupported() &&
      !this.hasCurrentInstallation() &&
      this.pushPermission() !== 'denied',
  );

  /**
   * Whether to explain the muted OS permission and offer the way back.
   *
   * Shown next to, not instead of, an installation's own switch: the two states
   * are independent and a user who sees only one cannot tell which one to fix.
   * It stays out of the way while the setup action is the answer — a device
   * that was never registered is told to register, not that something is
   * blocking it.
   */
  pushBlockedByOs = computed(
    () => this.osMutesThisDevice() && !this.showPushSetup(),
  );

  constructor() {
    // Watch for system theme changes
    this.registerSystemThemeChangeHandler();
  }

  registerSystemThemeChangeHandler(): void {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', this.handleSystemThemeChange.bind(this));
  }

  saveSettings(): void {
    if (!this.settingsForm.valid) {
      return;
    }

    const newSettings = this.settingsForm.getRawValue();
    const theme = this.calculateTheme(newSettings.theme);
    const favoriteCurrencies = [...new Set(newSettings.favoriteCurrencies)];

    this.submitSettings.emit({
      ...newSettings,
      // The location grant is recorded by onboarding and has no control on this
      // page. It is carried through explicitly because the settings write
      // replaces the document, so anything the form does not know about is lost.
      location: !!this.settings()?.location,
      emailUpdates: !!newSettings.emailUpdates,
      theme,
      currency: newSettings.currency || 'EUR',
      favoriteCurrencies,
    });
  }

  calculateTheme(theme: string | null): 'light' | 'dark' {
    return (theme || this.systemTheme()) as 'light' | 'dark';
  }

  onThemeChange(event: { detail: { value: string } }): void {
    const selectedTheme = event?.detail?.value;
    if (selectedTheme) {
      document.documentElement.classList.toggle(
        'dark',
        selectedTheme === 'dark',
      );
      document.documentElement.classList.toggle(
        'light',
        selectedTheme === 'light',
      );
    }
  }

  onCurrencySelected(currencyCode: string, modal: IonModal): void {
    this.settingsForm.patchValue({ currency: currencyCode });
    this.settingsForm.controls['currency'].markAsDirty();

    modal.dismiss();
  }

  onFavoriteCurrencyToggle(currencyCode: string): void {
    const favoriteCurrencies =
      this.settingsForm.controls['favoriteCurrencies'].value;
    const isFavoriteCurrency = favoriteCurrencies.includes(currencyCode);
    const newFavoriteCurrencies = isFavoriteCurrency
      ? favoriteCurrencies.filter((favoriteCurrencyCode) => {
          return favoriteCurrencyCode !== currencyCode;
        })
      : [...favoriteCurrencies, currencyCode];

    this.settingsForm.patchValue({
      favoriteCurrencies: newFavoriteCurrencies,
    });
    this.settingsForm.controls['favoriteCurrencies'].markAsDirty();
  }

  /**
   * Whether the OS is muting this row's device.
   *
   * Only the current installation can be judged. Another device's OS grant is
   * its own, and this device can neither see nor change it (issue #1184).
   */
  isMutedByOs(installation: PushInstallationView): boolean {
    return installation.isCurrentDevice && this.osMutesThisDevice();
  }

  /**
   * Whether notifications actually reach this installation.
   *
   * The token document's `enabled` flag is what BiteTribe was told to send, not
   * what arrives: an OS permission that was never granted, or was taken away
   * again, drops delivery without touching it. A switch driven by the flag
   * alone claims push is on for a device that cannot receive anything
   * (issue #1386).
   */
  isDeliveringTo(installation: PushInstallationView): boolean {
    return installation.enabled && !this.isMutedByOs(installation);
  }

  /**
   * Flips one installation's delivery switch.
   *
   * Ionic also emits `ionChange` when the bound `checked` value is applied, so a
   * value that already matches is dropped — otherwise reloading the list would
   * write every row back to Firestore. The comparison is against what the row
   * shows rather than against the stored flag, because a muted device shows off
   * while its flag says on.
   */
  onPushInstallationToggle(
    installation: PushInstallationView,
    event: { detail: { checked: boolean } },
  ): void {
    const enabled = event?.detail?.checked;

    if (
      enabled === undefined ||
      enabled === this.isDeliveringTo(installation)
    ) {
      return;
    }

    // Switching a muted device back on is a permission problem, not a Firestore
    // one: writing `enabled` would leave the switch on and the device just as
    // silent. The OS has to be asked first (issue #1386).
    if (enabled && this.isMutedByOs(installation)) {
      this.enablePushOnThisDevice.emit({ token: installation.token });

      return;
    }

    this.togglePushInstallation.emit({ token: installation.token, enabled });
  }

  handleSystemThemeChange(e: MediaQueryListEvent): void {
    this.systemTheme.set(this.getTheme(e.matches));
  }

  getTheme(matches: boolean): 'dark' | 'light' {
    return matches ? 'dark' : 'light';
  }
}
