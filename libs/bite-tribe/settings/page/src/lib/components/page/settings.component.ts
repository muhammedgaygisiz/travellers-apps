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
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/angular/standalone';
import { PublicUser, Settings, User } from 'model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { currencyCodes } from 'utils';
import type { OverlayEventDetail } from '@ionic/core';

const STAY_PUBLIC = 'stay-public';
const GO_PRIVATE = 'go-private';

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
    IonIcon,
    IonAlert,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSettings {
  user = input<User>();
  publicUser = input<PublicUser>();
  settings = input<Settings>();
  isPublicProfile = input<boolean>();

  goPublic = output();
  goPrivate = output();
  submitSettings = output<Settings>();
  submitPublicUser = output<PublicUser>();

  private readonly formBuilder = inject(FormBuilder);
  currencies = currencyCodes;
  isOpen = signal(false);

  confirmationButtons = [
    {
      text: 'No, stay public',
      role: STAY_PUBLIC,
    },
    {
      text: 'Yes, go private',
      role: GO_PRIVATE,
    },
  ];

  settingsForm = this.formBuilder.nonNullable.group({
    pushNotifications: [{ value: false, disabled: true }, Validators.required],
    emailUpdates: [{ value: false, disabled: true }, Validators.required],
    theme: ['light', Validators.required],
    currency: ['EUR', Validators.required],
    nearby: [2000, [Validators.required, Validators.min(1)]],
    city: [''],
    displayName: [''],
  });

  settingsEffect = afterRenderEffect(() => {
    const settings = this.settings();

    if (settings) {
      const { updatedAt, ...rest } = settings;
      this.settingsForm.patchValue(rest);
    }

    const publicUser = this.publicUser();
    if (publicUser) {
      this.settingsForm.patchValue(publicUser);
    }

    const displayName = this.displayName();
    this.settingsForm.patchValue({ displayName });
  });

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
      user?.providerData.find(
        (provider: { photoUrl?: string }) => provider.photoUrl
      )?.photoUrl;

    return photoUrl;
  });

  displayName = computed(() => {
    const user = this.user();
    const publicUser = this.publicUser();

    return publicUser?.displayName || user?.displayName || 'Anonymous';
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

    const { city, displayName, ...newSettings } = this.settingsForm.value;

    const publicUser = this.publicUser();
    if (publicUser) {
      this.submitPublicUser.emit({
        ...publicUser,
        city,
        displayName: displayName ? displayName : publicUser.displayName,
      });
    }

    this.submitSettings.emit({
      ...newSettings,
      pushNotifications: !!newSettings.pushNotifications,
      emailUpdates: !!newSettings.emailUpdates,
      theme: (newSettings.theme || this.systemTheme()) as 'light' | 'dark',
      currency: newSettings.currency || 'EUR',
      nearby: newSettings.nearby || 50,
    });
  }

  handleGoPrivateConfirmation(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === GO_PRIVATE) {
      this.goPrivate.emit();
    }

    this.isOpen.set(false);
  }

  openConfirmationDialog(): void {
    this.isOpen.set(true);
  }

  onThemeChange(event: { detail: { value: string } }): void {
    const selectedTheme = event?.detail?.value;
    if (selectedTheme) {
      document.documentElement.classList.toggle(
        'dark',
        selectedTheme === 'dark'
      );
      document.documentElement.classList.toggle(
        'light',
        selectedTheme === 'light'
      );
    }
  }
}
