import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ComponentRef,
  ElementRef,
  provideZonelessChangeDetection,
  Renderer2,
} from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { SnapDrawerComponent } from '../snap-drawer.component';
import SpyInstance = jest.SpyInstance;

class Mock {
  setStyle = jest.fn();
  nativeElement = {
    querySelector: jest.fn(),
  };
}

describe('SnapDrawerComponent', () => {
  let component: SnapDrawerComponent;
  let fixture: ComponentFixture<SnapDrawerComponent>;
  let componentRef: ComponentRef<SnapDrawerComponent>;
  let mockDrawerElement: jest.Mocked<HTMLElement>;

  beforeEach(() => {
    mockDrawerElement = {
      setPointerCapture: jest.fn(),
      releasePointerCapture: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      imports: [SnapDrawerComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
        { provide: ElementRef, useClass: Mock },
        { provide: Renderer2, useClass: Mock },
      ],
    });

    fixture = TestBed.createComponent(SnapDrawerComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize translateY to lowest snap position', () => {
      componentRef.setInput('snapPixels', [60, 480]);
      component.ngOnInit();

      expect(component.translateY).toBe(740);
    });

    it('should handle custom snap pixels', () => {
      componentRef.setInput('snapPixels', [100, 600]);
      component.ngOnInit();

      expect(component.translateY).toBe(700);
    });
  });

  describe('onResize', () => {
    it('should snap drawer to closest position when window resizes', () => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();

      component.translateY = 500;

      component.onResize();

      expect(component.translateY === 320 || component.translateY === 740).toBe(
        true
      );
    });
  });

  describe('snapOpenOrClosed', () => {
    beforeEach(() => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();
    });

    it('should snap to lowest position when drawer is open', () => {
      component.translateY = 300; // Below lowest snap (740)
      component.snapOpenOrClosed();
      expect(component.translateY).toBe(740);
    });

    it('should snap to highest position when drawer is closed', () => {
      component.translateY = 740; // At lowest snap
      component.snapOpenOrClosed();
      expect(component.translateY).toBe(320);
    });
  });

  describe('onPointerDown', () => {
    let mockEvent: jest.Mocked<PointerEvent>;
    let setPointerCaptureSpy: SpyInstance;

    beforeEach(() => {
      mockEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;

      setPointerCaptureSpy = jest.spyOn(mockDrawerElement, 'setPointerCapture');

      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();
      component.translateY = 500;
    });

    it('should initialize drag state', () => {
      component.onPointerDown(mockEvent);

      expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);
    });

    it('should store initial values', () => {
      component.onPointerDown(mockEvent);
      expect(component.translateY).toBe(500);
    });
  });

  describe('onPointerMove', () => {
    let mockEvent: jest.Mocked<PointerEvent>;

    beforeEach(() => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      mockEvent = {
        clientY: 450,
      } as any;
    });

    it('should not move when not dragging', () => {
      const upEvent = { pointerId: 1, target: mockDrawerElement } as any;
      component.onPointerUp(upEvent);

      const initialY = component.translateY;
      component.onPointerMove(mockEvent);
      expect(component.translateY).toBe(initialY);
    });
  });

  describe('onPointerUp', () => {
    let mockEvent: jest.Mocked<PointerEvent>;

    beforeEach(() => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();

      mockEvent = {
        pointerId: 1,
        target: mockDrawerElement,
      } as any;
    });

    it('should not process when not dragging', () => {
      component.onPointerUp(mockEvent);

      expect(mockDrawerElement.releasePointerCapture).not.toHaveBeenCalled();
    });

    it('should release pointer capture and enable transition when dragging', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      component.onPointerUp(mockEvent);

      expect(mockDrawerElement.releasePointerCapture).toHaveBeenCalledWith(1);
    });

    it('should snap to closest position after small drag', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 420 } as any; // 20px movement
      component.onPointerMove(moveEvent);

      component.onPointerUp(mockEvent);

      expect(component.translateY === 320 || component.translateY === 740).toBe(
        true
      );
    });

    it('should snap directionally after significant drag down', () => {
      component.translateY = 500; // Start in middle

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 520 } as any; // 120px down from start
      component.onPointerMove(moveEvent);

      component.onPointerUp(mockEvent);

      expect(component.translateY).toBe(740);
    });

    it('should snap directionally after significant drag up', () => {
      component.translateY = 500; // Start in middle

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 280 } as any; // 120px up from start
      component.onPointerMove(moveEvent);

      component.onPointerUp(mockEvent);

      expect(component.translateY).toBe(320);
    });
  });

  describe('window resize handling', () => {
    it('should recalculate snap positions on window resize', () => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();

      component.translateY = 500;

      Object.defineProperty(window, 'innerHeight', { value: 1000 });
      component.onResize();

      expect(component.translateY).toEqual(320);
    });
  });

  describe('input changes', () => {
    it('should handle different snap pixel configurations', () => {
      componentRef.setInput('snapPixels', [50, 200, 400]);
      fixture.detectChanges();

      expect(component.translateY).toBe(750);
    });

    it('should handle single snap pixel', () => {
      componentRef.setInput('snapPixels', [100]);
      fixture.detectChanges();

      expect(component.translateY).toBe(700);
    });
  });

  describe('drag behavior integration', () => {
    beforeEach(() => {
      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();
    });

    it('should handle complete drag sequence from middle position', () => {
      component.translateY = 500; // Start in middle

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 430 } as any;
      component.onPointerMove(moveEvent);

      const upEvent = { pointerId: 1, target: mockDrawerElement } as any;
      component.onPointerUp(upEvent);

      expect([320, 740]).toContain(component.translateY);
    });

    it('should maintain bounds during extreme movements', () => {
      component.translateY = 400;

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const extremeMoveEvent = { clientY: -1000 } as any;
      component.onPointerMove(extremeMoveEvent);

      expect(component.translateY).toBe(320);

      const extremeMoveDownEvent = { clientY: 5000 } as any;
      component.onPointerMove(extremeMoveDownEvent);

      expect(component.translateY).toBe(740);
    });
  });
});
