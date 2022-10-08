import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordValidatorComponent } from '../component/password-validator.component';
import { PasswordValidatorModule } from '../password-validator.module';

describe('PasswordValidatorComponent', () => {
  let component: PasswordValidatorComponent;
  let fixture: ComponentFixture<PasswordValidatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordValidatorModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordValidatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
