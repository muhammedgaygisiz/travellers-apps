import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPage } from '../details.page';
import { PageComponent } from 'common/ui/page';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef } from '@angular/core';

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
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default reviews', () => {
    expect(component.reviews()).toEqual([
      {
        id: '1',
        author: 'Jacob',
        comment: 'Really tasty and flavourful',
        date: '2 days',
      },
    ]);
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
      const img = fixture.debugElement.query(By.css('ion-img'));
      expect(img.attributes['ng-reflect-src']).toBe('test.jpg');

      const content = fixture.debugElement.nativeElement.textContent;
      expect(content).toContain('Pizza');
      expect(content).toContain('Italian Restaurant');
    });
  });
});
