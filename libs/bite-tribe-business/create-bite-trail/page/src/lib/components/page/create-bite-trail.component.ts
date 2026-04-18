import {
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
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Bite, BiteTrail, PublicUser } from 'model';
import { CurrencySelectorComponent } from 'currency-selector';
import { currencyCodes } from 'utils';
import { ImageUploadComponent } from 'image-upload';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'create-bite-trail-page',
  templateUrl: 'create-bite-trail.component.html',
  styleUrl: 'create-bite-trail.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonInput,
    IonTextarea,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonNote,
    IonText,
    IonModal,
    ReactiveFormsModule,
    CurrencySelectorComponent,
    ImageUploadComponent,
    IonIcon,
  ],
})
export class CreateBiteTrailComponent {
  private readonly formBuilder = inject(FormBuilder);

  selectedBites = input<Bite[]>([]);
  employees = input<PublicUser[]>([]);
  organisation = input<PublicUser | undefined>();

  readonly submitTrail =
    output<
      Omit<
        BiteTrail,
        | 'id'
        | 'createdAt'
        | 'createdAtTimestamp'
        | 'updatedAt'
        | 'updatedAtTimestamp'
      >
    >();

  currencies = currencyCodes;

  localSelectedBiteIds = signal<string[]>([]);

  biteTrailFormGroup = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    location: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['EUR', Validators.required],
    image: [''],
    imagePath: [''],
  });

  selectedBitesInitEffect = effect(() => {
    const bites = this.selectedBites();
    this.localSelectedBiteIds.set(bites.map((b) => b.id));
  });

  isInvalid = toSignal(
    this.biteTrailFormGroup.valueChanges.pipe(
      map(() => !this.biteTrailFormGroup.valid),
    ),
    { initialValue: !this.biteTrailFormGroup.valid },
  );

  currencyValueChanges = toSignal(
    this.biteTrailFormGroup.controls['currency'].valueChanges,
  );

  selectedCurrencyName = computed(() => {
    this.currencyValueChanges();
    const currencyCode = this.biteTrailFormGroup.controls['currency'].value;
    return this.currencies.find((c) => c.code === currencyCode)?.name;
  });

  displayedBites = computed(() => {
    const allBites = this.selectedBites();
    return allBites;
  });

  imagePathValue = toSignal(
    this.biteTrailFormGroup.valueChanges.pipe(
      map((formValue) => formValue.imagePath),
    ),
  );

  imageUrl = computed(() => {
    const imagePathValue = this.imagePathValue();

    return imagePathValue || undefined;
  });

  protected readonly fallbackPosition = signal<{
    latitude: number;
    longitude: number;
  } | null>(null);

  isBiteSelected(bite: Bite): boolean {
    return this.localSelectedBiteIds().includes(bite.id);
  }

  toggleBite(bite: Bite): void {
    const currentIds = this.localSelectedBiteIds();
    const index = currentIds.indexOf(bite.id);
    if (index > -1) {
      this.localSelectedBiteIds.set(currentIds.filter((id) => id !== bite.id));
    } else {
      this.localSelectedBiteIds.set([...currentIds, bite.id]);
    }
  }

  getEmployeeName(userId: string | undefined): string {
    if (!userId) {
      return '';
    }
    const employee = this.employees().find((e) => e.userId === userId);
    return employee?.displayName ?? '';
  }

  onCurrencySelected(currencyCode: string, modal: IonModal): void {
    this.biteTrailFormGroup.patchValue({ currency: currencyCode });
    modal.dismiss();
  }

  saveTrail(): void {
    if (!this.biteTrailFormGroup.valid) {
      return;
    }

    const org = this.organisation();
    const formValue = this.biteTrailFormGroup.getRawValue();

    this.submitTrail.emit({
      ownerId: org?.userId ?? '',
      ownerName: org?.displayName ?? '',
      ownerImagePath: org?.photoUrl ?? '',
      name: formValue.name,
      description: formValue.description,
      location: formValue.location,
      price: formValue.price,
      currency: formValue.currency,
      imagePath: formValue.imagePath,
      biteIds: this.localSelectedBiteIds(),
    });
  }

  resetImagePath(): void {
    this.biteTrailFormGroup.get('imagePath')?.reset();
  }
}
