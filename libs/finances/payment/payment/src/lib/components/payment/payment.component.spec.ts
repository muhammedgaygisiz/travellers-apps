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

    expect(component.paymentFormGroup.value).toEqual({ amount: 100 });
  });
});
