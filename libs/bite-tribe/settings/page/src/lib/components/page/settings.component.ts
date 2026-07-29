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
  IonSelect,
  IonSelectOption,
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
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSettings {
  user = input<User | null | undefined>();
  publicUser = input<PublicUser>();
  settings = input<Settings>();
  showEmailVerificationPrompt = input(false);
  pushPermissionState = input<PushPermissionState>('checking');
  pushNotificationsPreference = input<boolean>();
  pushSettingsOpenFailed = input(false);

  submitSettings = output<Settings>();
  logout = output<void>();
  resendEmailVerification = output<void>();
  deleteAccount = output<void>();
  pushNotificationsChange = output<boolean>();
  openPushSettings = output<void>();
  refreshPushPermission = output<void>();

  private readonly formBuilder = inject(FormBuilder);

  currencies = currencyCodes;

  settingsForm = this.formBuilder.nonNullable.group({
    pushNotifications: [false, Validators.required],
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

  pushNotificationsPreferenceEffect = afterRenderEffect(() => {
    const preference = this.pushNotificationsPreference();

    if (preference === undefined) {
      return;
    }

    const control = this.settingsForm.controls.pushNotifications;
    control.setValue(preference, { emitEvent: false });
    control.markAsDirty();
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
      pushNotifications: !!newSettings.pushNotifications,
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

  handleSystemThemeChange(e: MediaQueryListEvent): void {
    this.systemTheme.set(this.getTheme(e.matches));
  }

  getTheme(matches: boolean): 'dark' | 'light' {
    return matches ? 'dark' : 'light';
  }
}
