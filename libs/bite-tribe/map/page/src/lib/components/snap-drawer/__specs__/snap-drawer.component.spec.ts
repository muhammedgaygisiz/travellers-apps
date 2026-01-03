import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
import { vi, Mock as ViMock, MockInstance } from 'vitest';

class Mock {
  setStyle = vi.fn();
  nativeElement = {
    querySelector: vi.fn(),
  };
}

const computeSnapOffsetsMock = vi.fn();
vi.mock('../utils/compute-snap-offsets', () => ({
  computeSnapOffsets: (...args: any): void => computeSnapOffsetsMock(...args),
}));

const getLowestSnapMock = vi.fn();
vi.mock('../utils/get-lowest-snap', () => ({
  getLowestSnap: (...args: any): void => getLowestSnapMock(...args),
}));

const getHighestSnapMock = vi.fn();
vi.mock('../utils/get-highest-snap', () => ({
  getHighestSnap: (...args: any): void => getHighestSnapMock(...args),
}));

const findNextSnapDownMock = vi.fn();
vi.mock('../utils/find-next-snap-down', () => ({
  findNextSnapDown: (...args: any): void => findNextSnapDownMock(...args),
}));

const findClosestSnapMock = vi.fn();
vi.mock('../utils/find-closest-snap', () => ({
  findClosestSnap: (...args: any): void => findClosestSnapMock(...args),
}));

describe('SnapDrawerComponent', () => {
  let component: SnapDrawerComponent;
  let fixture: ComponentFixture<SnapDrawerComponent>;
  let componentRef: ComponentRef<SnapDrawerComponent>;
  let mockDrawerElement: any;

  beforeEach(() => {
    mockDrawerElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
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
    it('should compute snap offsets and set translateY to lowest snap', () => {
      computeSnapOffsetsMock.mockReturnValue([320, 740]);
      getLowestSnapMock.mockReturnValue(740);

      component.ngOnInit();

      expect(computeSnapOffsetsMock).toHaveBeenCalledWith([120, 480]);
      expect(getLowestSnapMock).toHaveBeenCalledWith([320, 740]);
      expect(component.translateY).toBe(740);
    });
  });

  describe('ngAfterViewInit', () => {
    let querySelectorSpy: MockInstance;
    let setStyleSpy: ViMock;
    beforeEach(() => {
      // not pretty but the only way to mock querySelector and setStyle
      querySelectorSpy = vi
        .spyOn(component['elementRef'].nativeElement, 'querySelector')
        .mockReturnValue({});
      setStyleSpy = vi
        .spyOn(component['renderer'], 'setStyle')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should enable transition after timeout', () => {
      querySelectorSpy.mockReturnValue(mockDrawerElement);

      component.ngAfterViewInit();

      vi.advanceTimersByTime(1);

      expect(setStyleSpy).toHaveBeenCalledWith(
        mockDrawerElement,
        'transition',
        'transform 0.3s ease',
      );
    });
  });

  describe('onResize', () => {
    it('should snap to closest position', () => {
      findClosestSnapMock.mockReturnValue(320);
      component.translateY = 400;

      component.onResize();

      expect(findClosestSnapMock).toHaveBeenCalled();
      expect(component.translateY).toBe(320);
    });
  });

  describe('snapOpenOrClosed', () => {
    it('should snap to lowest when drawer is open', () => {
      getLowestSnapMock.mockReturnValue(740);
      getHighestSnapMock.mockReturnValue(320);
      component.translateY = 400; // Less than lowest (open state)

      component.snapOpenOrClosed();

      expect(component.translateY).toBe(740);
    });

    it('should snap to highest when drawer is closed', () => {
      getLowestSnapMock.mockReturnValue(740);
      getHighestSnapMock.mockReturnValue(320);
      component.translateY = 740; // Equal to lowest (closed state)

      component.snapOpenOrClosed();

      expect(component.translateY).toBe(320);
    });
  });

  describe('onPointerDown', () => {
    let mockEvent: any;
    let setPointerCaptureSpy: MockInstance;
    let setStyleSpy: ViMock;

    beforeEach(() => {
      mockEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;

      setPointerCaptureSpy = vi.spyOn(mockDrawerElement, 'setPointerCapture');

      componentRef.setInput('snapPixels', [60, 480]);
      fixture.detectChanges();
      component.translateY = 500;
      setStyleSpy = vi
        .spyOn(component['renderer'], 'setStyle')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should initialize drag state', () => {
      component.onPointerDown(mockEvent);

      expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);
      expect(setStyleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onPointerMove', () => {
    beforeEach(() => {
      computeSnapOffsetsMock.mockReturnValue([320, 740]);
      fixture.detectChanges();
    });

    it('should not move when not dragging', () => {
      const initialY = component.translateY;
      const moveEvent = { clientY: 500 } as any;

      component.onPointerMove(moveEvent);

      expect(component.translateY).toBe(initialY);
    });

    it('should update translateY when dragging', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 450 } as any;
      component.onPointerMove(moveEvent);

      expect(component.translateY).toBe(740);
    });

    it('should constrain movement to minimum bound when dragging beyond highest snap', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const extremeMoveEvent = { clientY: -1000 } as any;
      component.onPointerMove(extremeMoveEvent);

      expect(component.translateY).toBe(320); // Clamped to minimum
    });

    it('should constrain movement to maximum bound when dragging beyond lowest snap', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const extremeMoveEvent = { clientY: 2000 } as any;
      component.onPointerMove(extremeMoveEvent);

      expect(component.translateY).toBe(740); // Clamped to maximum
    });
  });

  describe('onPointerUp', () => {
    let setStyleSpy: ViMock;

    beforeEach(() => {
      setStyleSpy = vi
        .spyOn(component['renderer'], 'setStyle')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should not process when not dragging', () => {
      const upEvent = {
        pointerId: 1,
        target: mockDrawerElement,
      } as any;

      component.onPointerUp(upEvent);

      expect(mockDrawerElement.releasePointerCapture).not.toHaveBeenCalled();
    });

    it('should release pointer capture and enable transition when dragging', () => {
      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const upEvent = {
        pointerId: 1,
        target: mockDrawerElement,
      } as any;
      findClosestSnapMock.mockReturnValue(320);

      component.onPointerUp(upEvent);

      expect(mockDrawerElement.releasePointerCapture).toHaveBeenCalledWith(1);
      expect(setStyleSpy).toHaveBeenCalled();
    });

    it('should snap to closest when drag distance is small', () => {
      computeSnapOffsetsMock.mockReturnValue([320, 740]);
      findClosestSnapMock.mockReturnValue(320);
      fixture.detectChanges();

      const downEvent = {
        pointerId: 1,
        clientY: 400,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 410 } as any; // Small movement (10px)
      component.onPointerMove(moveEvent);

      const upEvent = {
        pointerId: 1,
        target: mockDrawerElement,
      } as any;
      component.onPointerUp(upEvent);

      expect(findClosestSnapMock).toHaveBeenCalled();
      expect(component.translateY).toBe(320);
    });

    it('should snap up when dragging up with sufficient distance', () => {
      computeSnapOffsetsMock.mockReturnValue([320, 740]);
      getHighestSnapMock.mockReturnValue(320);
      fixture.detectChanges();

      const downEvent = {
        pointerId: 1,
        clientY: 500,
        target: mockDrawerElement,
      } as any;
      component.onPointerDown(downEvent);

      const moveEvent = { clientY: 350 } as any; // 150px up
      component.onPointerMove(moveEvent);

      const upEvent = {
        pointerId: 1,
        target: mockDrawerElement,
      } as any;
      component.onPointerUp(upEvent);

      expect(component.translateY).toBe(320);
    });
  });
});
