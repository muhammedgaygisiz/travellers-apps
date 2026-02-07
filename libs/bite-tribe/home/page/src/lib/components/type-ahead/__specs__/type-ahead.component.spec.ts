import { TypeaheadComponent } from '../type-ahead.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;
  let compRef: ComponentRef<TypeaheadComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TypeaheadComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter items based on search term', () => {
    compRef.setInput('items', ['apple', 'banana', 'cherry']);
    component.rawSearchTerm.set('ap');
    expect(component.filteredItems()).toEqual(['apple']);
  });

  it('should emit selectionChange on confirmChanges', () => {
    const selectionChangeSpy = jest.spyOn(component.selectionChange, 'emit');
    component.workingSelectedValues.set(['apple']);
    component.confirmChanges();
    expect(selectionChangeSpy).toHaveBeenCalledWith({
      distanceFilter: '',
      priceFilter: 0,
      tagFilters: ['apple'],
    });
  });

  it('should emit selectionCancel on cancelChanges', () => {
    const selectionCancelSpy = jest.spyOn(component.selectionCancel, 'emit');
    component.cancelChanges();
    expect(selectionCancelSpy).toHaveBeenCalled();
  });

  describe('searchbarInput', () => {
    it('should filter list based on input value', () => {
      const event = { target: { value: 'banana' } } as any;

      compRef.setInput('items', ['apple', 'banana', 'cherry']);
      component.searchbarInput(event);
      expect(component.filteredItems()).toEqual(['banana']);
    });

    it('should reset filtered items if no input value is provided', () => {
      const event = { target: { value: '' } } as any;

      compRef.setInput('items', ['apple', 'banana', 'cherry']);
      component.searchbarInput(event);
      expect(component.filteredItems()).toEqual(['apple', 'banana', 'cherry']);
    });
  });

  describe('isChecked', () => {
    it('should return true if value is in workingSelectedValues', () => {
      component.workingSelectedValues.set(['apple']);
      expect(component.isChecked('apple')).toBe(true);
    });

    it('should return false if value is not in workingSelectedValues', () => {
      component.workingSelectedValues.set(['banana']);
      expect(component.isChecked('apple')).toBe(false);
    });
  });

  describe('checkboxChange', () => {
    it('should add value to workingSelectedValues if checked', () => {
      component.workingSelectedValues.set(['apple']);
      const event = { detail: { checked: true, value: 'banana' } } as any;
      component.checkboxChange(event);
      expect(component.workingSelectedValues()).toEqual(['apple', 'banana']);
    });

    it('should remove value from workingSelectedValues if unchecked', () => {
      component.workingSelectedValues.set(['apple', 'banana']);
      const event = { detail: { checked: false, value: 'banana' } } as any;
      component.checkboxChange(event);
      expect(component.workingSelectedValues()).toEqual(['apple']);
    });
  });

  describe('distanceInput', () => {
    describe('given input value', () => {
      it('should update distanceValue on input event', () => {
        const event = { target: { value: '100' } } as any;
        component.distanceInput(event);
        expect(component.distanceValue()).toBe('100');
      });
    });

    describe('given empty input', () => {
      it('should not update distanceValue if input is empty', () => {
        const event = { target: { value: '' } } as any;
        component.distanceInput(event);
        expect(component.distanceValue()).toBe('');
      });
    });

    describe('given distance input', () => {
      it('should return distance as string', () => {
        compRef.setInput('distance', 555);
        compRef.changeDetectorRef.detectChanges();

        expect(component.distanceValue()).toBe('555');
      });
    });
  });

  describe('priceInput', () => {
    it('should update priceValue on input event', () => {
      const event = { target: { value: '50' } } as any;
      component.priceInput(event);
      expect(component.priceValue()).toBe(50);
    });
  });
});
