import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddBankComponent } from './add-bank.component';
import { provideIonicAngular } from '@ionic/angular/standalone';

jest.mock('localization');

describe('AddBankComponent', () => {
  let component: AddBankComponent;
  let fixture: ComponentFixture<AddBankComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(AddBankComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
