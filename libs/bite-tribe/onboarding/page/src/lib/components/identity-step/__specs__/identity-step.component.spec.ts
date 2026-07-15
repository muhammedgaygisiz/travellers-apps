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
});
