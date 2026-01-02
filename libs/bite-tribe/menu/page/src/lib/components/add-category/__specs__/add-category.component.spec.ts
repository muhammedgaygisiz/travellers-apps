import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddCategoryComponent } from '../add-category.component';
import { vi } from 'vitest';

describe('AddCategoryComponent', () => {
  let component: AddCategoryComponent;
  let fixture: ComponentFixture<AddCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCategoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCategoryComponent);
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
      vi.spyOn(component.addCategory, 'emit');
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
