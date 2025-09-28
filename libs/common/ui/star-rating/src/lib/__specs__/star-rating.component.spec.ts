import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from '../star-rating.component';
import { ComponentRef } from '@angular/core';

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;
  let compRef: ComponentRef<StarRatingComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onRate', () => {
    it('should emit rated event when not readonly', () => {
      const ratedSpy = jest.spyOn(component.rated, 'emit');
      compRef.setInput('readonly', false);

      component.onRate(3);

      expect(ratedSpy).toHaveBeenCalledWith(3);
    });

    it('should not emit rated event when readonly', () => {
      const ratedSpy = jest.spyOn(component.rated, 'emit');
      compRef.setInput('readonly', true);

      component.onRate(3);

      expect(ratedSpy).not.toHaveBeenCalled();
    });
  });

  describe('onHover', () => {
    it('should update hoveredIndex when not readonly', () => {
      compRef.setInput('readonly', false);

      component.onHover(2);

      expect(component.hoveredIndex()).toBe(2);
    });

    it('should not update hoveredIndex when readonly', () => {
      compRef.setInput('readonly', true);

      component.onHover(2);

      expect(component.hoveredIndex()).toBe(-1);
    });
  });

  describe('onLeave', () => {
    it('should reset hoveredIndex to -1', () => {
      component.hoveredIndex.set(2);

      component.onLeave();

      expect(component.hoveredIndex()).toBe(-1);
    });
  });

  describe('inputs', () => {
    it('should initialize with default values', () => {
      expect(component.rating()).toBe(0);
      expect(component.readonly()).toBe(false);
    });

    it('should update input values', () => {
      compRef.setInput('rating', 3);
      compRef.setInput('readonly', true);

      expect(component.rating()).toBe(3);
      expect(component.readonly()).toBe(true);
    });
  });

  describe('registerOnChange', () => {
    it('should register onChange callback', () => {
      const mockFn = jest.fn();
      component.registerOnChange(mockFn);
      component._onChange(5);
      expect(mockFn).toHaveBeenCalledWith(5);
    });
  });

  describe('registerOnTouched', () => {
    it('should register onTouch callback', () => {
      const mockFn = jest.fn();
      component.registerOnTouched(mockFn);
      component._onTouch();
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('getRating', () => {
    it('should return value if set', () => {
      component.value.set(4);
      expect(component.getRating()).toBe(4);
    });

    it('should return rating input if value is not set', () => {
      compRef.setInput('rating', 3);
      expect(component.getRating()).toBe(3);
    });

    it('should return 0 if neither value nor rating input is set', () => {
      expect(component.getRating()).toBe(0);
    });
  });
});
