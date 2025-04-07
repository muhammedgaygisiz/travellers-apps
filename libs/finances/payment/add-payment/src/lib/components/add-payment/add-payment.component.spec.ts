import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddPaymentComponent } from './add-payment.component';
import { provideIonicAngular } from '@ionic/angular/standalone';

describe('AddPaymentComponent', () => {
  let component: AddPaymentComponent;
  let fixture: ComponentFixture<AddPaymentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(AddPaymentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
