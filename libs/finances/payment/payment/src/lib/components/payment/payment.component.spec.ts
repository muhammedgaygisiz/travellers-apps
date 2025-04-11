import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentComponent } from './payment.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef } from '@angular/core';

describe('AddPaymentComponent', () => {
  let component: PaymentComponent;
  let fixture: ComponentFixture<PaymentComponent>;
  let compRef: ComponentRef<PaymentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(PaymentComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the form group when payment input changes', () => {
    const mockPayment = { amount: 100 };
    compRef.setInput('payment', mockPayment);

    fixture.detectChanges();

    expect(component.paymentFormGroup.value).toEqual({ amount: 100, date: '' });
  });

  it('should open date picker on single click', async () => {
    const mockEvent = { detail: 1 } as MouseEvent;
    const createSpy = jest
      .spyOn(component.popoverController, 'create')
      .mockReturnValue(
        Promise.resolve({
          present: jest.fn(),
        } as any)
      );

    await component.openDatePicker(mockEvent);

    expect(createSpy).toHaveBeenCalled();
  });

  it('should not open date picker on multiple clicks', async () => {
    const mockEvent = { detail: 2 } as MouseEvent;
    const createSpy = jest.spyOn(component.popoverController, 'create');

    await component.openDatePicker(mockEvent);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should update the date control on ionChange event', () => {
    const mockEvent = { value: '01.01.2023' };
    const patchValueSpy = jest.spyOn(
      component.paymentFormGroup.controls['date'],
      'patchValue'
    );

    component.onIonChange(mockEvent);

    expect(patchValueSpy).toHaveBeenCalledWith('01.01.2023');
  });

  it('should emit submitPayment on form submission', () => {
    const emitSpy = jest.spyOn(component.submitPayment, 'emit');
    component.paymentFormGroup.setValue({ amount: 100, date: '01.01.2023' });

    component.onSubmitClick();

    expect(emitSpy).toHaveBeenCalledWith({
      amount: 100,
      date: new Date('2022-12-31T23:00:00.000Z'),
    });
  });
});
