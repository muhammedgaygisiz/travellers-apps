import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from '../login.component';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();
vi.mock('localization');

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
    const submitSignupWithGoogleEmitSpy = vi.spyOn(
      component.submitSignupWithGoogle,
      'emit',
    );
    component.onGoogleSignUp();

    expect(submitSignupWithGoogleEmitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit submitSignupWithApple on button click', () => {
    const submitSignupWithAppleEmitSpy = vi.spyOn(
      component.submitSignupWithApple,
      'emit',
    );
    component.onAppleSignUp();

    expect(submitSignupWithAppleEmitSpy).toHaveBeenCalledTimes(1);
  });
});
