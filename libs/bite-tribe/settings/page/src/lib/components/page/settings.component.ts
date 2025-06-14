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
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/angular/standalone';
import { Settings, User } from 'model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class PageSettings {
  user = input<User>();
  settings = input<Settings>();
  isPublicProfile = input<boolean>();

  goPublic = output();
  goPrivate = output();

  private readonly formBuilder = inject(FormBuilder);

  settingsForm = this.formBuilder.nonNullable.group({
    pushNotifications: [false, Validators.required],
    emailUpdates: [true, Validators.required],
    theme: ['light', Validators.required],
    currency: ['EUR', Validators.required],
  });

  settingsEffect = afterRenderEffect(() => {
    const settings = this.settings();
    if (settings) {
      // eslint-disable-next-line no-unused-vars
      const { updatedAt, ...rest } = settings;
      this.settingsForm.setValue(rest);
    }
  });

  submitSettings = output<Settings>();

  private systemTheme = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  isFormInvalid = toSignal(
    this.settingsForm.valueChanges.pipe(
      map(() => {
        return !this.settingsForm.valid;
      })
    ),
    { initialValue: !this.settingsForm.valid }
  );

  isFormPristine = toSignal(
    this.settingsForm.valueChanges.pipe(
      map(() => {
        return this.settingsForm.pristine;
      })
    ),
    { initialValue: this.settingsForm.pristine }
  );

  themeEffect = effect(() => {
    const systemTheme = this.systemTheme();

    this.settingsForm.patchValue({ theme: systemTheme });
  });

  userImage = computed(() => {
    const user = this.user();

    const photoUrl =
      user?.photoUrl ||
      user?.providerData.find((provider: any) => provider.photoUrl)?.photoUrl;

    return photoUrl;
  });

  constructor() {
    // Watch for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        this.systemTheme.set(e.matches ? 'dark' : 'light');
      });
  }

  saveSettings() {
    if (!this.settingsForm.valid) {
      return;
    }

    const newSettings = this.settingsForm.value;

    this.submitSettings.emit({
      ...newSettings,
      pushNotifications: !!newSettings.pushNotifications,
      emailUpdates: !!newSettings.emailUpdates,
      theme: (newSettings.theme || this.systemTheme()) as 'light' | 'dark',
      currency: newSettings.currency || 'EUR',
    });
  }
}
