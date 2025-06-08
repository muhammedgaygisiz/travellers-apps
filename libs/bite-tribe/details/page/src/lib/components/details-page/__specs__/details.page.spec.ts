import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPage } from '../details.page';
import { PageComponent } from 'common/ui/page';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ToBlobUrlPipe } from 'image-compression';

@Pipe({ name: 'toBlobUrl' })
class MockToBlobUrlPipe implements PipeTransform {
  transform(value: string) {
    return value;
  }
}

describe('DetailsPage', () => {
  let component: DetailsPage;
  let fixture: ComponentFixture<DetailsPage>;
  let componentRef: ComponentRef<DetailsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        ReactiveFormsModule,
        PageComponent,
        DetailsPage,
      ],
    })
      .overrideComponent(DetailsPage, {
        remove: { imports: [ToBlobUrlPipe] },
        add: { imports: [MockToBlobUrlPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DetailsPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default reviews', () => {
    expect(component.reviews()).toMatchSnapshot();
  });

  describe('Tags Form', () => {
    it('should initialize with empty tags field', () => {
      expect(component.newTagsFormGroup.get('tags')?.value).toBe('');
    });

    it('should be invalid when tags field is empty', () => {
      component.newTagsFormGroup.patchValue({ tags: '' });
      expect(component.isTagsFieldInvalid()).toBe(true);
    });

    it('should be valid when tags field has value', () => {
      component.newTagsFormGroup.patchValue({ tags: 'italian spicy' });
      expect(component.isTagsFieldInvalid()).toBe(false);
    });

    it('should emit tags and reset form on saveTags', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewTags, 'emit');
      component.newTagsFormGroup.patchValue({ tags: 'italian spicy' });

      // Act
      component.saveTags();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith('italian spicy');
      expect(component.newTagsFormGroup.get('tags')?.value).toBe('');
    });

    it('should not emit tags when form is invalid', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewTags, 'emit');
      component.newTagsFormGroup.patchValue({ tags: '' });

      // Act
      component.saveTags();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Bite Display', () => {
    it('should display bite details when bite input is provided', () => {
      // Arrange
      const mockBite = {
        id: '1',
        name: 'Pizza',
        place: 'Italian Restaurant',
        price: 12.99,
        image: 'test.jpg',
        tags: ['italian', 'pizza'],
      };

      // Act
      componentRef.setInput('bite', mockBite);
      fixture.detectChanges();

      // Assert
      const img = fixture.debugElement.query(By.css('img'));
      expect(img.attributes['src']).toBe('test.jpg');

      const content = fixture.debugElement.nativeElement.textContent;
      expect(content).toContain('Pizza');
      expect(content).toContain('Italian Restaurant');
    });
  });

  describe('Review Form', () => {
    it('should initialize with empty review field', () => {
      expect(component.reviewFormGroup.get('review')?.value).toBe('');
    });

    it('should be invalid when review field is empty', () => {
      component.reviewFormGroup.patchValue({ review: '' });
      expect(component.isReviewFieldInvalid()).toBe(true);
    });

    it('should be valid when review field has value', () => {
      component.reviewFormGroup.patchValue({ review: 'Great food!' });
      expect(component.isReviewFieldInvalid()).toBe(false);
    });

    it('should emit review and reset form on saveReview when bite exists', () => {
      // Arrange
      const mockBite = { id: '123', name: 'Pizza' };
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      componentRef.setInput('bite', mockBite);
      component.reviewFormGroup.patchValue({ review: 'Great food!' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith({
        review: 'Great food!',
        biteId: '123',
      });
      expect(component.reviewFormGroup.get('review')?.value).toBe('');
    });

    it('should not emit review when form is invalid', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      component.reviewFormGroup.patchValue({ review: '' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit review when bite id is missing', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      componentRef.setInput('bite', undefined);
      component.reviewFormGroup.patchValue({ review: 'Great food!' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
