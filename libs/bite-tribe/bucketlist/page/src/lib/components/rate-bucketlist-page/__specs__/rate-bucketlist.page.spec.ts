import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { RateBucketlistPage } from '../rate-bucketlist.page';

addNecessaryIcons();

describe('RateBucketlistPage', () => {
  let component: RateBucketlistPage;
  let fixture: ComponentFixture<RateBucketlistPage>;
  let componentRef: ComponentRef<RateBucketlistPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    fixture = TestBed.createComponent(RateBucketlistPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitRating when form is valid and no existing rating', () => {
    const submitSpy = jest.spyOn(component.submitRating, 'emit');
    component.ratingFormGroup.patchValue({ rating: 5, review: 'Great trail!' });

    component.onSubmit();

    expect(submitSpy).toHaveBeenCalledWith({
      rating: 5,
      review: 'Great trail!',
    });
  });

  it('should disable form and not emit submitRating when existing rating is provided', () => {
    const submitSpy = jest.spyOn(component.submitRating, 'emit');
    componentRef.setInput('existingRating', {
      rating: 4,
      review: 'Already rated',
    });
    fixture.detectChanges();

    component.onSubmit();

    expect(component.ratingFormGroup.disabled).toBe(true);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should enable form again when existing rating is removed', () => {
    componentRef.setInput('existingRating', {
      rating: 4,
      review: 'Already rated',
    });
    fixture.detectChanges();

    componentRef.setInput('existingRating', undefined);
    fixture.detectChanges();

    expect(component.ratingFormGroup.enabled).toBe(true);
  });

  it('should not emit submitRating when form is invalid', () => {
    const submitSpy = jest.spyOn(component.submitRating, 'emit');
    component.ratingFormGroup.patchValue({ rating: 0, review: '' });

    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
  });
});
