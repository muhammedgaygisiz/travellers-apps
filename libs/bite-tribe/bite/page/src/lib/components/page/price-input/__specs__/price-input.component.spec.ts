import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { PriceInputComponent } from '../price-input.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

@Component({
  template: `
    <form [formGroup]="form">
      <bt-price-input [currencyLoading]="currencyLoading" />
    </form>
  `,
  imports: [ReactiveFormsModule, PriceInputComponent],
})
class HostComponent {
  form = new FormGroup({
    price: new FormControl<string | null>(null),
    currency: new FormControl('EUR'),
  });
  currencyLoading = false;
}

describe('PriceInputComponent', () => {
  let hostFixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: PriceInputComponent;

  const createComponent = (): void => {
    hostFixture = TestBed.createComponent(HostComponent);
    host = hostFixture.componentInstance;
    hostFixture.detectChanges();
    component = hostFixture.debugElement.query(
      By.directive(PriceInputComponent),
    ).componentInstance;
  };

  beforeEach(() => {
    MockTranslocoService.getActiveLang.mockReturnValue('en');

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
  });

  describe('onCurrencySelected', () => {
    it('should set currency in the parent form group and dismiss the modal', () => {
      createComponent();
      const dismissSpy = jest.fn();

      component.onCurrencySelected('USD', { dismiss: dismissSpy } as never);

      expect(host.form.controls['currency'].value).toBe('USD');
      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('currency in the field', () => {
    it('should show the currency code, not its name, so a long name cannot crowd out the input', () => {
      createComponent();

      host.form.controls['currency'].patchValue('BAM');
      hostFixture.detectChanges();

      const shown = hostFixture.debugElement.query(
        By.css('[data-testid="bite-price-currency"]'),
      ).nativeElement as HTMLElement;

      expect(shown.textContent?.trim()).toBe('BAM');
    });

    it('should keep the full currency name as the accessible name', () => {
      createComponent();

      host.form.controls['currency'].patchValue('USD');
      hostFixture.detectChanges();

      const trigger = hostFixture.debugElement.query(
        By.css('#currency-selector-trigger-bite'),
      ).nativeElement as HTMLElement;

      expect(trigger.getAttribute('aria-label')).toBe('US Dollar');
    });
  });

  describe('selectedCurrencyName', () => {
    it('should return the localized selected currency name', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      createComponent();

      host.form.controls['currency'].patchValue('USD');

      expect(component.selectedCurrencyName()).toBe('US-Dollar');
    });
  });
});
