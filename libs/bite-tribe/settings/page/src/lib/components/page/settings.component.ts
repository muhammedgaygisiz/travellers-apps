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

  submitSettings = output<Settings>();
  logout = output<void>();

  private readonly formBuilder = inject(FormBuilder);

  currencies = currencyCodes;

  settingsForm = this.formBuilder.nonNullable.group({
    pushNotifications: [{ value: false, disabled: true }, Validators.required],
    emailUpdates: [{ value: false, disabled: true }, Validators.required],
    theme: ['light', Validators.required],
    currency: ['EUR', Validators.required],
    language: ['en', Validators.required],
    nearby: [2000, [Validators.required, Validators.min(1)]],
  });

  settingsEffect = afterRenderEffect(() => {
    const settings = this.settings();

    if (settings) {
      const { updatedAt, ...rest } = settings;
      this.settingsForm.patchValue(rest);
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

  subscriptionTier = computed(() => {
    const user = this.publicUser();
    return user?.subscriptionTier ?? 0;
  });

  isFreeUser = computed(() => this.subscriptionTier() === 0);
  isProUser = computed(() => this.subscriptionTier() >= 1);

  constructor() {
    // Watch for system theme changes
    this.registerSystemThemeChangeHandler();
    this.registerSystemLanguageChangeHandler();
  }

  registerSystemThemeChangeHandler(): void {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', this.handleSystemThemeChange.bind(this));
  }

  private registerSystemLanguageChangeHandler(): void {
    window
      .matchMedia('(prefers-language: en)')
      .addEventListener('change', this.handleSystemLanguageChange.bind(this));
  }

  saveSettings(): void {
    if (!this.settingsForm.valid) {
      return;
    }

    const newSettings = this.settingsForm.getRawValue();
    const theme = this.calculateTheme(newSettings.theme);

    this.submitSettings.emit({
      ...newSettings,
      pushNotifications: !!newSettings.pushNotifications,
      emailUpdates: !!newSettings.emailUpdates,
      theme,
      currency: newSettings.currency || 'EUR',
      nearby: newSettings.nearby || 50,
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

  handleSystemThemeChange(e: MediaQueryListEvent): void {
    this.systemTheme.set(this.getTheme(e.matches));
  }

  handleSystemLanguageChange(e: MediaQueryListEvent): void {
    this.systemLanguage.set(this.getTheme(e.matches));
  }

  getTheme(matches: boolean): 'dark' | 'light' {
    return matches ? 'dark' : 'light';
  }
}
