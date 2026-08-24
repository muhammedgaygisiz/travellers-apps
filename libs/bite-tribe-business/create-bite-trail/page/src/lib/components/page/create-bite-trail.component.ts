import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Bite, BiteTrail, PublicUser } from 'model';
import { CurrencySelectorComponent } from 'currency-selector';
import { currencyCodes, getLocalizedCurrencyName } from 'utils';
import { ImageUploadComponent } from 'image-upload';
import { TranslocoService } from '@jsverse/transloco';

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
  private readonly transloco = inject(TranslocoService);

  bites = input<Bite[]>([]);
  owner = input<PublicUser | undefined>();

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

  private readonly formInvalid = toSignal(
    this.biteTrailFormGroup.valueChanges.pipe(
      map(() => !this.biteTrailFormGroup.valid),
    ),
    { initialValue: !this.biteTrailFormGroup.valid },
  );

  // A BiteTrail with no Bites is not a trail. The Bites used to be picked on
  // the organisation dashboard and arrive already selected, so the form alone
  // could decide this; they are picked here now, starting from none.
  isInvalid = computed(
    (): boolean =>
      this.formInvalid() || this.localSelectedBiteIds().length === 0,
  );

  currencyValueChanges = toSignal(
    this.biteTrailFormGroup.controls['currency'].valueChanges,
  );
  activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  selectedCurrencyName = computed(() => {
    this.currencyValueChanges();
    const activeLang = this.activeLang();
    const currencyCode = this.biteTrailFormGroup.controls['currency'].value;
    const currency = this.currencies.find((c) => c.code === currencyCode);
    return currency
      ? getLocalizedCurrencyName(currency.code, activeLang, currency.name)
      : undefined;
  });

  displayedBites = computed(() => this.bites());

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

  onCurrencySelected(currencyCode: string, modal: IonModal): void {
    this.biteTrailFormGroup.patchValue({ currency: currencyCode });
    modal.dismiss();
  }

  saveTrail(): void {
    if (!this.biteTrailFormGroup.valid) {
      return;
    }

    const owner = this.owner();
    const formValue = this.biteTrailFormGroup.getRawValue();

    this.submitTrail.emit({
      ownerId: owner?.userId ?? '',
      ownerName: owner?.displayName ?? '',
      ownerImagePath: owner?.photoUrl ?? '',
      name: formValue.name,
      description: formValue.description,
      location: formValue.location,
      price: formValue.price,
      currency: formValue.currency,
      image: formValue.image,
      imagePath: formValue.imagePath,
      biteIds: this.localSelectedBiteIds(),
    });
  }

  resetImagePath(): void {
    this.biteTrailFormGroup.get('imagePath')?.reset();
  }
}
