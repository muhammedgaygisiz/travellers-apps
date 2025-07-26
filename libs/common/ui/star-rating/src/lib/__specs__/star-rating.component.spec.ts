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

  describe('getStars', () => {
    it('should generate correct array of stars based on max input', () => {
      compRef.setInput('max', 3);
      const stars = component.getStars();
      expect(stars).toEqual([1, 2, 3]);
    });

    it('should update stars array when max changes', () => {
      compRef.setInput('max', 4);
      let stars = component.getStars();
      expect(stars).toEqual([1, 2, 3, 4]);

      compRef.setInput('max', 3);

      stars = component.getStars();
      expect(stars).toEqual([1, 2, 3]);
    });
  });

  describe('onRate', () => {
    it('should emit rated event when not readonly', () => {
      const ratedSpy = jest.spyOn(component.rated, 'emit');
      compRef.setInput('readOnly', false);

      component.onRate(3);

      expect(ratedSpy).toHaveBeenCalledWith(3);
    });

    it('should not emit rated event when readonly', () => {
      const ratedSpy = jest.spyOn(component.rated, 'emit');
      compRef.setInput('readOnly', true);

      component.onRate(3);

      expect(ratedSpy).not.toHaveBeenCalled();
    });
  });

  describe('onHover', () => {
    it('should update hoveredIndex when not readonly', () => {
      compRef.setInput('readOnly', false);

      component.onHover(2);

      expect(component.hoveredIndex()).toBe(2);
    });

    it('should not update hoveredIndex when readonly', () => {
      compRef.setInput('readOnly', true);

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
      expect(component.max()).toBe(5);
      expect(component.readOnly()).toBe(false);
    });

    it('should update input values', () => {
      compRef.setInput('rating', 3);
      compRef.setInput('max', 10);
      compRef.setInput('readOnly', true);

      expect(component.rating()).toBe(3);
      expect(component.max()).toBe(10);
      expect(component.readOnly()).toBe(true);
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
});
