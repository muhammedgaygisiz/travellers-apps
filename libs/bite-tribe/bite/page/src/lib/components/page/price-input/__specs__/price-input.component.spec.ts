import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
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

  describe('selectedCurrencyName', () => {
    it('should return the localized selected currency name', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      createComponent();

      host.form.controls['currency'].patchValue('USD');

      expect(component.selectedCurrencyName()).toBe('US-Dollar');
    });
  });
});
