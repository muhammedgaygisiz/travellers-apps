import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonModal } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { CurrencyStepComponent } from '../currency-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
  getActiveLang: (): string => 'en',
};

describe(CurrencyStepComponent.name, () => {
  let fixture: ComponentFixture<CurrencyStepComponent>;
  let component: CurrencyStepComponent;

  const text = (testId: string): string =>
    (
      (fixture.debugElement.nativeElement as HTMLElement).querySelector(
        `[data-testid="${testId}"]`,
      )?.textContent ?? ''
    ).trim();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CurrencyStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrencyStepComponent);
    component = fixture.componentInstance;
  });

  it('shows the prefilled default currency by name', () => {
    fixture.componentRef.setInput('currency', 'USD');

    fixture.detectChanges();

    expect(text('onboarding-currency-default-value')).toContain('US Dollar');
  });

  it('names no currencies while favorites are empty, so the template falls back to the placeholder', () => {
    fixture.detectChanges();

    expect(component['favoriteCurrencyNames']()).toBe('');
  });

  it('lists the selected favorite currencies by name', () => {
    fixture.componentRef.setInput('favoriteCurrencies', ['USD', 'EUR']);

    fixture.detectChanges();

    const value = text('onboarding-currency-favorites-value');
    expect(value).toContain('US Dollar');
    expect(value).toContain('Euro');
  });

  it('emits the chosen default currency and closes the picker', () => {
    fixture.detectChanges();
    const currencyChange = jest.spyOn(component.currencyChange, 'emit');
    const modal = { dismiss: jest.fn() } as unknown as IonModal;

    component.selectCurrency('GBP', modal);

    expect(currencyChange).toHaveBeenCalledWith('GBP');
    expect(modal.dismiss).toHaveBeenCalled();
  });

  it('emits a favorite toggle without closing the picker, so several can be picked', () => {
    fixture.detectChanges();
    const favoriteCurrencyToggle = jest.spyOn(
      component.favoriteCurrencyToggle,
      'emit',
    );

    component.toggleFavorite('CHF');

    expect(favoriteCurrencyToggle).toHaveBeenCalledWith('CHF');
  });
});
