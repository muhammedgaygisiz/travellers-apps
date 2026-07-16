import { Component, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { ImageUploadComponent } from 'image-upload';
import { IdentityStepComponent } from '../identity-step.component';

@Component({
  selector: 'image-upload',
  template: '',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadStubComponent),
      multi: true,
    },
  ],
})
class ImageUploadStubComponent implements ControlValueAccessor {
  /* eslint-disable @typescript-eslint/no-empty-function */
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
  /* eslint-enable @typescript-eslint/no-empty-function */
}

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(IdentityStepComponent.name, () => {
  let fixture: ComponentFixture<IdentityStepComponent>;
  let component: IdentityStepComponent;

  beforeEach(() => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [IdentityStepComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(IdentityStepComponent, {
        remove: { imports: [ImageUploadComponent] },
        add: { imports: [ReactiveFormsModule, ImageUploadStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(IdentityStepComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prefills display name and photo from the current profile', () => {
    fixture.componentRef.setInput('profile', {
      displayName: 'Mo',
      photoUrl: 'profile-photo',
    });

    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({
      displayName: 'Mo',
      photoUrl: 'profile-photo',
    });
  });

  it('does not emit draft or availability events when profile data hydrates the form', () => {
    const identityChange = jest.spyOn(component.identityChange, 'emit');
    const checkDisplayName = jest.spyOn(component.checkDisplayName, 'emit');

    fixture.componentRef.setInput('profile', {
      displayName: 'Mo',
      photoUrl: 'profile-photo',
    });
    fixture.detectChanges();
    jest.advanceTimersByTime(250);

    expect(identityChange).not.toHaveBeenCalled();
    expect(checkDisplayName).not.toHaveBeenCalled();
  });

  it('emits the identity draft and asks for availability after input settles', () => {
    const identityChange = jest.spyOn(component.identityChange, 'emit');
    const checkDisplayName = jest.spyOn(component.checkDisplayName, 'emit');

    component.form.patchValue({
      displayName: '  NewName  ',
      photoUrl: 'new-photo',
    });
    jest.advanceTimersByTime(250);

    expect(identityChange).toHaveBeenLastCalledWith({
      displayName: 'NewName',
      photoUrl: 'new-photo',
    });
    expect(checkDisplayName).toHaveBeenLastCalledWith('NewName');
  });

  it('does not ask for availability when the display name is empty', () => {
    const checkDisplayName = jest.spyOn(component.checkDisplayName, 'emit');

    component.form.patchValue({ displayName: '   ' });
    jest.advanceTimersByTime(250);

    expect(checkDisplayName).not.toHaveBeenCalled();
  });

  it('does not ask for availability again when only the photo changes', () => {
    const checkDisplayName = jest.spyOn(component.checkDisplayName, 'emit');

    component.form.patchValue({ displayName: 'NewName' });
    jest.advanceTimersByTime(250);
    expect(checkDisplayName).toHaveBeenCalledTimes(1);

    component.form.patchValue({ photoUrl: 'new-photo' });
    jest.advanceTimersByTime(250);

    expect(checkDisplayName).toHaveBeenCalledTimes(1);
  });

  it('does not emit form changes when availability changes revalidate the control', () => {
    const identityChange = jest.spyOn(component.identityChange, 'emit');
    const checkDisplayName = jest.spyOn(component.checkDisplayName, 'emit');

    fixture.componentRef.setInput('availability', 'taken');
    fixture.detectChanges();
    jest.advanceTimersByTime(250);

    expect(identityChange).not.toHaveBeenCalled();
    expect(checkDisplayName).not.toHaveBeenCalled();
  });

  it.each(['taken', 'invalid', 'error'] as const)(
    'marks the control invalid and touched when availability is %s',
    (state) => {
      fixture.componentRef.setInput('availability', state);
      fixture.detectChanges();

      const control = component.form.controls.displayName;
      expect(control.invalid).toBe(true);
      expect(control.errors).toEqual({ [state]: true });
      expect(control.touched).toBe(true);
    },
  );

  it.each(['idle', 'checking', 'available'] as const)(
    'clears the control error when availability is %s',
    (state) => {
      fixture.componentRef.setInput('availability', 'taken');
      fixture.detectChanges();
      expect(component.form.controls.displayName.invalid).toBe(true);

      fixture.componentRef.setInput('availability', state);
      fixture.detectChanges();

      expect(component.form.controls.displayName.errors).toBeNull();
      expect(component.form.controls.displayName.valid).toBe(true);
    },
  );
});
