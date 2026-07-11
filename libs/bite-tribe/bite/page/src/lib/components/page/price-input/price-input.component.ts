import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  ControlContainer,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  IonIcon,
  IonInput,
  IonModal,
  IonSkeletonText,
  IonText,
} from '@ionic/angular/standalone';
import { CurrencySelectorComponent } from 'currency-selector';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { currencyCodes, getLocalizedCurrencyName } from 'utils';

@Component({
  selector: 'bt-price-input',
  templateUrl: 'price-input.component.html',
  styleUrl: 'price-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Reuse the parent form so the price/currency controls stay in one FormGroup.
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonText,
    IonIcon,
    IonSkeletonText,
    IonModal,
    CurrencySelectorComponent,
    TranslocoPipe,
  ],
})
export class PriceInputComponent implements OnInit {
  private readonly controlContainer = inject(ControlContainer);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  currencyLoading = input<boolean>(false);
  favCurrencies = input<string[]>();

  private readonly currencies = currencyCodes;

  private readonly currencyCode = signal<string>('EUR');

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  readonly selectedCurrencyName = computed(() => {
    const code = this.currencyCode();
    const activeLang = this.activeLang();
    const currency = this.currencies.find((c) => c.code === code);
    return currency
      ? getLocalizedCurrencyName(currency.code, activeLang, currency.name)
      : undefined;
  });

  get form(): FormGroup {
    return this.controlContainer.control as FormGroup;
  }

  ngOnInit(): void {
    const currencyControl = this.form.get('currency');

    this.currencyCode.set(currencyControl?.value ?? 'EUR');

    currencyControl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.currencyCode.set(value ?? 'EUR'));
  }

  onCurrencySelected(currencyCode: string, modal: IonModal): void {
    this.form.get('currency')?.patchValue(currencyCode);
    void modal.dismiss();
  }
}
