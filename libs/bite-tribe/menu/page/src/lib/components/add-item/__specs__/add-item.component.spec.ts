import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddItemComponent } from '../add-item.component';

describe('AddItemComponent', () => {
  let component: AddItemComponent;
  let fixture: ComponentFixture<AddItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isInvalid', () => {
    it('should be true when form is invalid', () => {
      component.newItemForm.controls['name'].setValue('');
      fixture.detectChanges();
      expect(component.isInvalid()).toBe(true);
    });

    it('should be false when form is valid', () => {
      component.newItemForm.controls['name'].setValue('Valid Title');
      fixture.detectChanges();
      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('onAddItem', () => {
    beforeEach(() => {
      jest.spyOn(component.addItem, 'emit');
    });

    it('should emit addItem event when form is valid', () => {
      component.newItemForm.controls['name'].setValue('New Item');
      component.newItemForm.controls['description'].setValue('description');

      component.onAddItem();

      expect(component.addItem.emit).toHaveBeenCalledWith({
        name: 'New Item',
        description: 'description',
        ingredients: '',
        notes: '',
        price: 0,
      });
    });

    it('should not emit addItem event when form is invalid', () => {
      component.newItemForm.controls['name'].setValue('');

      component.onAddItem();

      expect(component.addItem.emit).not.toHaveBeenCalled();
    });
  });
});
