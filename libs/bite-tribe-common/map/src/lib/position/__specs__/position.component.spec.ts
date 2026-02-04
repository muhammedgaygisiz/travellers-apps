import { PositionComponent } from '../position.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

jest.mock('../../map/utils/leaflet-markercluster', () => ({
  L: {
    icon: jest.fn(),
    Marker: {
      prototype: {
        options: {},
      },
    },
    markerClusterGroup: jest.fn(),
  },
}));

describe(PositionComponent.name, () => {
  let component: PositionComponent;
  let fixture: ComponentFixture<PositionComponent>;
  let componentRef: ComponentRef<PositionComponent>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PositionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('writeValue', () => {
    it('should set the value signal', () => {
      const geopoint = { latitude: 10, longitude: 20 };
      component.writeValue(geopoint);
      expect(component.value()).toEqual(geopoint);
    });
  });

  describe('registerOnChange', () => {
    it('should register the onChange function', () => {
      const fn = jest.fn();
      component.registerOnChange(fn);
      expect(component['_onChange']).toBe(fn);
    });
  });

  describe('registerOnTouched', () => {
    it('should register the onTouch function', () => {
      const fn = jest.fn();
      component.registerOnTouched(fn);
      expect(component['_onTouch']).toBe(fn);
    });
  });

  describe('setDisabledState', () => {
    it('should set the disabled signal', () => {
      expect(component.setDisabledState).toBeTruthy();

      if (component.setDisabledState) {
        component.setDisabledState(true);
        expect(component.disabled()).toBe(true);
        component.setDisabledState(false);
        expect(component.disabled()).toBe(false);
      }
    });
  });

  describe('setValue', () => {
    it('should set the value and call onChange and onTouch', () => {
      const geopoint = { latitude: 30, longitude: 40 };
      const onChangeSpy = jest.fn();
      const onTouchSpy = jest.fn();

      component.registerOnChange(onChangeSpy);
      component.registerOnTouched(onTouchSpy);

      component.setValue(geopoint);

      expect(component.value()).toEqual(geopoint);
      expect(onChangeSpy).toHaveBeenCalledWith(geopoint);
      expect(onTouchSpy).toHaveBeenCalled();
    });
  });
});
