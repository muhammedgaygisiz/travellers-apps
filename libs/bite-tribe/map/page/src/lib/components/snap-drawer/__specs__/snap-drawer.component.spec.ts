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

  describe('ngAfterViewInit', () => {
    let querySelectorSpy: SpyInstance;
    let setStyleSpy: SpyInstance;
    beforeEach(() => {
      // not pretty but the only way to mock querySelector and setStyle
      querySelectorSpy = jest
        .spyOn(component['elementRef'].nativeElement, 'querySelector')
        .mockReturnValue({});
      setStyleSpy = jest
        .spyOn(component['renderer'], 'setStyle')
        .mockImplementation();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should enable transition after timeout', () => {
      querySelectorSpy.mockReturnValue(mockDrawerElement);

      component.ngAfterViewInit();

      jest.advanceTimersByTime(1);

      expect(setStyleSpy).toHaveBeenCalledWith(
        mockDrawerElement,
        'transition',
        'transform 0.3s ease'
      );
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
});
