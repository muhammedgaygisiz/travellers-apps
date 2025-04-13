import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from '../login.component';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

jest.mock('localization');

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitSignupWithGoogle on button click', () => {
    const submitSignupWithGoogleEmitSpy = jest.spyOn(
      component.submitSignupWithGoogle,
      'emit'
    );
    component.onGoogleSignUp();

    expect(submitSignupWithGoogleEmitSpy).toHaveBeenCalledTimes(1);
  });
});
