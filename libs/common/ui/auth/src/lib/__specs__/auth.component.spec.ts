import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from '../components/login.component';
import { EventEmitter } from '@angular/core';
import Mock = jest.Mock;
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

jest.mock('localization');

describe('AuthComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let submitSignupWithGoogleEmitter: Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });
    fixture = TestBed.createComponent(LoginComponent);
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

    expect(submitSignupWithGoogleEmitter).toHaveBeenCalledTimes(1);
  });
});
