import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from '../star-rating.component';
import { Component, ComponentRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HapticsService } from 'haptics';

const STAR_WIDTH = 30;

/** The middle of star `n` (1-based); each star is 30px wide, from x = 0. */
const xOf = (star: number): number => (star - 1) * STAR_WIDTH + STAR_WIDTH / 2;

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;
  let compRef: ComponentRef<StarRatingComponent>;

  let tick: jest.Mock;

  beforeEach(() => {
    tick = jest.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: HapticsService, useValue: { tick } }],
    });

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

  describe('ticking through the stars', () => {
    const row = (): HTMLElement =>
      fixture.nativeElement.querySelector('.star-rating');

    const icons = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('ion-icon'));

    // jsdom has no layout and no `PointerEvent`: lay the stars out side by
    // side and hand the handlers the fields they read.
    const pointer = (
      type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
      clientX: number,
      init: { pointerId?: number; isPrimary?: boolean } = {},
    ): void => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX,
        ...init,
      });
      row().dispatchEvent(event);
      fixture.detectChanges();
    };

    const drag = (from: number, to: number): void => {
      pointer('pointerdown', xOf(from));
      const step = from < to ? 1 : -1;
      for (let star = from; star !== to; star += step) {
        // Several moves inside each star, as a real finger produces.
        pointer('pointermove', xOf(star + step) - 8);
        pointer('pointermove', xOf(star + step));
        pointer('pointermove', xOf(star + step) + 8);
      }
    };

    beforeEach(() => {
      icons().forEach((icon, index) => {
        icon.getBoundingClientRect = (): DOMRect =>
          ({
            left: index * STAR_WIDTH,
            right: (index + 1) * STAR_WIDTH,
          }) as DOMRect;
      });
    });

    it('plays tick exactly three times dragging from one star to four', () => {
      compRef.setInput('rating', 1);
      fixture.detectChanges();

      drag(1, 4);

      expect(tick).toHaveBeenCalledTimes(3);
    });

    it('plays nothing while the pointer moves within the same star', () => {
      compRef.setInput('rating', 2);
      fixture.detectChanges();

      pointer('pointerdown', xOf(2) - 10);
      pointer('pointermove', xOf(2));
      pointer('pointermove', xOf(2) + 10);

      expect(tick).not.toHaveBeenCalled();
    });

    it('plays one tick for a tap that changes the rating', () => {
      pointer('pointerdown', xOf(3));
      pointer('pointerup', xOf(3));

      expect(tick).toHaveBeenCalledTimes(1);
    });

    it('shows the drag as it goes and commits it once, on release', () => {
      const rated = jest.spyOn(component.rated, 'emit');
      compRef.setInput('rating', 1);
      fixture.detectChanges();

      drag(1, 4);

      expect(component.hoveredIndex()).toBe(4);
      expect(rated).not.toHaveBeenCalled();

      pointer('pointerup', xOf(4));
      // The click the browser fires for the same tap must not commit again.
      icons()[3].click();

      expect(rated).toHaveBeenCalledTimes(1);
      expect(rated).toHaveBeenCalledWith(4);
      expect(component.value()).toBe(4);
      expect(component.hoveredIndex()).toBe(-1);
    });

    it('pops the star that becomes the selected one', () => {
      pointer('pointerdown', xOf(2));

      expect(component.poppedStar()).toBe(2);
      expect(icons()[1].classList).toContain('popped');

      component.onPopEnd(2);
      fixture.detectChanges();

      expect(icons()[1].classList).not.toContain('popped');
    });

    it('holds the first and last star when the drag runs off the row', () => {
      compRef.setInput('rating', 3);
      fixture.detectChanges();

      pointer('pointerdown', xOf(3));
      pointer('pointermove', 5 * STAR_WIDTH + 200);

      expect(component.hoveredIndex()).toBe(5);

      pointer('pointermove', -200);

      expect(component.hoveredIndex()).toBe(1);
    });

    it('commits nothing when the browser cancels the drag', () => {
      const rated = jest.spyOn(component.rated, 'emit');
      compRef.setInput('rating', 2);
      fixture.detectChanges();

      drag(2, 4);
      pointer('pointercancel', xOf(4));

      expect(rated).not.toHaveBeenCalled();
      expect(component.getRating()).toBe(2);
      expect(component.hoveredIndex()).toBe(-1);
    });

    it('rates and ticks on a plain click, with no drag before it', () => {
      const rated = jest.spyOn(component.rated, 'emit');

      icons()[2].click();
      fixture.detectChanges();

      expect(rated).toHaveBeenCalledWith(3);
      expect(tick).toHaveBeenCalledTimes(1);
    });

    it('ignores a pointercancel from a pointer that is not dragging', () => {
      compRef.setInput('rating', 2);
      fixture.detectChanges();

      drag(2, 4);
      pointer('pointercancel', xOf(4), { pointerId: 2 });
      pointer('pointerup', xOf(4));

      expect(component.value()).toBe(4);
    });

    it('ignores a secondary mouse button', () => {
      const event = new Event('pointerdown', { bubbles: true });
      Object.assign(event, {
        pointerId: 1,
        isPrimary: true,
        button: 2,
        clientX: xOf(3),
      });
      row().dispatchEvent(event);

      expect(tick).not.toHaveBeenCalled();
    });

    it('ignores a second finger', () => {
      pointer('pointerdown', xOf(3), { isPrimary: false });

      expect(tick).not.toHaveBeenCalled();
    });

    it('ignores moves from a pointer that is not dragging', () => {
      pointer('pointermove', xOf(4));
      pointer('pointerup', xOf(4));

      expect(tick).not.toHaveBeenCalled();
      expect(component.value()).toBeNull();
    });

    it('plays nothing on any pointer event when read-only', () => {
      compRef.setInput('readonly', true);
      fixture.detectChanges();

      drag(1, 5);
      pointer('pointerup', xOf(5));

      expect(tick).not.toHaveBeenCalled();
      expect(component.value()).toBeNull();
    });

    it('ticks once when the keyboard changes the rating, and not when it keeps it', () => {
      compRef.setInput('rating', 2);
      fixture.detectChanges();

      component.onRate(4);
      component.onRate(4);

      expect(tick).toHaveBeenCalledTimes(1);
    });
  });

  describe('as a form control', () => {
    @Component({
      template: `<star-rating [formControl]="control" />`,
      imports: [StarRatingComponent, ReactiveFormsModule],
    })
    class HostComponent {
      control = new FormControl<number | null>(2);
    }

    it('takes the control value and reports a rating back to it', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const rating = host.debugElement.children[0]
        .componentInstance as StarRatingComponent;

      expect(rating.getRating()).toBe(2);

      rating.onRate(5);

      expect(host.componentInstance.control.value).toBe(5);
      expect(host.componentInstance.control.touched).toBe(true);
    });
  });
});
