import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from '../components/auth.component';
import { EventEmitter } from '@angular/core';
import Mock = jest.Mock;
import { addNecessaryIcons } from '@travellers-apps/utils-common';

addNecessaryIcons();

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let submitSignupWithGoogleEmitter: Mock;

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;

    submitSignupWithGoogleEmitter = jest.fn();
    component.submitSignupWithGoogle = {
      emit: submitSignupWithGoogleEmitter,
    } as unknown as EventEmitter<void>;

    fixture.detectChanges();
  });

  afterEach(() => {
    submitSignupWithGoogleEmitter.mockClear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitSignupWithGoogle on button click', () => {
    component.onGoogleSignUp();
    fixture.detectChanges();

    expect(submitSignupWithGoogleEmitter).toBeCalledTimes(1);
  });
});
