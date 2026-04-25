import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessAddCategoryComponent } from '../business-add-category.component';

describe('BusinessAddCategoryComponent', () => {
  let component: BusinessAddCategoryComponent;
  let fixture: ComponentFixture<BusinessAddCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessAddCategoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessAddCategoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isInvalid', () => {
    it('should be true when form is invalid', () => {
      component.newCategoryForm.controls['title'].setValue('');
      fixture.detectChanges();
      expect(component.isInvalid()).toBe(true);
    });

    it('should be false when form is valid', () => {
      component.newCategoryForm.controls['title'].setValue('Valid Title');
      fixture.detectChanges();
      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('onAddCategory', () => {
    beforeEach(() => {
      jest.spyOn(component.addCategory, 'emit');
    });

    it('should emit addCategory event when form is valid', () => {
      component.newCategoryForm.controls['title'].setValue('New Category');
      component.newCategoryForm.controls['subtitle'].setValue('Subtitle');

      component.onAddCategory();

      expect(component.addCategory.emit).toHaveBeenCalledWith({
        title: 'New Category',
        subtitle: 'Subtitle',
      });
    });

    it('should not emit addCategory event when form is invalid', () => {
      component.newCategoryForm.controls['title'].setValue('');

      component.onAddCategory();

      expect(component.addCategory.emit).not.toHaveBeenCalled();
    });
  });
});
