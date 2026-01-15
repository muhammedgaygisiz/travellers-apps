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
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonText,
  IonToggle,
} from '@ionic/angular/standalone';
import { CurrencySelectorComponent } from 'currency-selector';
import { PublicUser, Settings, User } from 'model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { currencyCodes } from 'utils';

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
    IonInput,
    ReactiveFormsModule,
    IonModal,
    CurrencySelectorComponent,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSettings {
  user = input<User>();
  publicUser = input<PublicUser>();
  settings = input<Settings>();

  submitSettings = output<Settings>();

  private readonly formBuilder = inject(FormBuilder);

  currencies = currencyCodes;

  settingsForm = this.formBuilder.nonNullable.group({
    pushNotifications: [{ value: false, disabled: true }, Validators.required],
    emailUpdates: [{ value: false, disabled: true }, Validators.required],
    theme: ['light', Validators.required],
    currency: ['EUR', Validators.required],
    nearby: [2000, [Validators.required, Validators.min(1)]],
  });

  settingsEffect = afterRenderEffect(() => {
    const settings = this.settings();

    if (settings) {
      const { updatedAt, ...rest } = settings;
      this.settingsForm.patchValue(rest);
    }
  });

  private systemTheme = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  isFormInvalid = toSignal(
    this.settingsForm.valueChanges.pipe(map(() => !this.settingsForm.valid)),
    { initialValue: !this.settingsForm.valid },
  );

  isFormPristine = toSignal(
    this.settingsForm.valueChanges.pipe(
      map(() => {
        return this.settingsForm.pristine;
      }),
    ),
    { initialValue: this.settingsForm.pristine },
  );

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

  constructor() {
    // Watch for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        this.systemTheme.set(e.matches ? 'dark' : 'light');
      });
  }

  saveSettings(): void {
    if (!this.settingsForm.valid) {
      return;
    }

    const newSettings = this.settingsForm.getRawValue();
    this.submitSettings.emit({
      ...newSettings,
      pushNotifications: !!newSettings.pushNotifications,
      emailUpdates: !!newSettings.emailUpdates,
      theme: (newSettings.theme || this.systemTheme()) as 'light' | 'dark',
      currency: newSettings.currency || 'EUR',
      nearby: newSettings.nearby || 50,
    });
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
    modal.dismiss();
  }
}
