import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessAddItemComponent } from '../business-add-item.component';

describe('BusinessAddItemComponent', () => {
  let component: BusinessAddItemComponent;
  let fixture: ComponentFixture<BusinessAddItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessAddItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessAddItemComponent);
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
      component.newItemForm.controls['name'].setValue('Valid Name');
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
