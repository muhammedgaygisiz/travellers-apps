import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  ComponentRef,
  CUSTOM_ELEMENTS_SCHEMA,
  forwardRef,
  input,
  output,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { ImageUploadComponent } from 'image-upload';
import { RetryUploadButtonComponent } from 'bite-tribe-common/bite';
import type { Restaurant } from 'model';
import { RestaurantPhotoEditorComponent } from '../restaurant-photo-editor.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

/** The shared picker, reduced to what this component hands it. */
@Component({
  selector: 'image-upload',
  template: '',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockImageUploadComponent),
      multi: true,
    },
  ],
})
class MockImageUploadComponent implements ControlValueAccessor {
  readonly imageUrl = input<string>();
  readonly clearImagePath = output<void>();
  disabled = false;
  onChange: (value: string | null) => void = () => undefined;
  writeValue(): void {
    return;
  }
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(): void {
    return;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

const RESTAURANT = {
  id: 'r-1',
  name: 'Trattoria Roma',
  imagePath: 'https://example.test/stored.jpg',
  position: { latitude: 0, longitude: 0 },
} as Restaurant;

/** See GitHub issue #2126: one box, the way Create Bite's is. */
describe(RestaurantPhotoEditorComponent.name, () => {
  let fixture: ComponentFixture<RestaurantPhotoEditorComponent>;
  let component: RestaurantPhotoEditorComponent;
  let ref: ComponentRef<RestaurantPhotoEditorComponent>;

  const picker = (): MockImageUploadComponent =>
    fixture.debugElement.query(
      (el) => el.componentInstance instanceof MockImageUploadComponent,
    ).componentInstance;
  const byTestId = (id: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] })
      .overrideComponent(RestaurantPhotoEditorComponent, {
        remove: {
          imports: [
            ImageUploadComponent,
            RetryUploadButtonComponent,
            TranslocoPipe,
          ],
        },
        add: {
          imports: [MockImageUploadComponent, MockTranslocoPipe],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RestaurantPhotoEditorComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    ref.setInput('restaurant', RESTAURANT);
    fixture.detectChanges();
  });

  it('shows the stored photo in the box, with nothing to save', () => {
    expect(picker().imageUrl()).toBe('https://example.test/stored.jpg');
    expect(byTestId('restaurant-photo-save')).toBeNull();
    expect(byTestId('restaurant-photo-cancel')).toBeNull();
  });

  it('falls back to a photo from candidate verification', () => {
    ref.setInput('restaurant', {
      ...RESTAURANT,
      imagePath: undefined,
      image: 'data:image/jpeg;base64,AAAA',
    });
    fixture.detectChanges();

    expect(picker().imageUrl()).toBe('data:image/jpeg;base64,AAAA');
  });

  it('prefers a photo that landed this session, and the one being sent while pending', () => {
    ref.setInput('uploadedImagePath', 'https://example.test/landed.jpg');
    fixture.detectChanges();
    expect(picker().imageUrl()).toBe('https://example.test/landed.jpg');

    ref.setInput('status', 'pending');
    ref.setInput('pendingPhoto', 'data:image/jpeg;base64,PEND');
    fixture.detectChanges();
    expect(picker().imageUrl()).toBe('data:image/jpeg;base64,PEND');
  });

  it('empties the box when the photo is deleted, and brings it back on cancel', () => {
    picker().clearImagePath.emit();
    fixture.detectChanges();

    expect(picker().imageUrl()).toBeUndefined();
    expect(byTestId('restaurant-photo-cancel')).toBeTruthy();
    expect(byTestId('restaurant-photo-save')).toBeNull();

    byTestId('restaurant-photo-cancel')?.click();
    fixture.detectChanges();

    expect(picker().imageUrl()).toBe('https://example.test/stored.jpg');
  });

  it('saves a newly chosen photo and settles the box', () => {
    const saved: string[] = [];
    component.savePhoto.subscribe((photo) => saved.push(photo));

    picker().onChange('data:image/jpeg;base64,NEW');
    fixture.detectChanges();
    byTestId('restaurant-photo-save')?.click();
    fixture.detectChanges();

    expect(saved).toEqual(['data:image/jpeg;base64,NEW']);
    expect(byTestId('restaurant-photo-save')).toBeNull();
  });

  it('does nothing on save without a chosen photo', () => {
    const saved: string[] = [];
    component.savePhoto.subscribe((photo) => saved.push(photo));

    component.save();

    expect(saved).toEqual([]);
  });

  it('disables the picker while a photo is being sent', () => {
    ref.setInput('status', 'pending');
    fixture.detectChanges();

    expect(component.photoControl.disabled).toBe(true);
    expect(byTestId('restaurant-photo-pending')).toBeTruthy();

    ref.setInput('status', 'uploaded');
    fixture.detectChanges();

    expect(component.photoControl.disabled).toBe(false);
  });

  it('offers retry on a failure it can resend, and asks for the photo otherwise', () => {
    const retries: unknown[] = [];
    component.retry.subscribe(() => retries.push(true));

    ref.setInput('status', 'failed');
    ref.setInput('canRetry', true);
    fixture.detectChanges();
    byTestId('restaurant-photo-retry')?.dispatchEvent(new Event('retry'));
    expect(byTestId('restaurant-photo-retry')).toBeTruthy();

    ref.setInput('canRetry', false);
    fixture.detectChanges();
    expect(byTestId('restaurant-photo-retry')).toBeNull();
    expect(byTestId('restaurant-photo-failed')?.textContent).toContain(
      'restaurant-photo-choose-again',
    );
  });

  it('hides the status while a new photo is being chosen', () => {
    ref.setInput('status', 'failed');
    fixture.detectChanges();
    picker().clearImagePath.emit();
    fixture.detectChanges();

    expect(byTestId('restaurant-photo-failed')).toBeNull();
  });
});
