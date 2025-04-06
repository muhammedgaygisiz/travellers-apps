import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddBankComponent } from './add-bank.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';

describe('AddBankComponent', () => {
  let component: AddBankComponent;
  let fixture: ComponentFixture<AddBankComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(AddBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
