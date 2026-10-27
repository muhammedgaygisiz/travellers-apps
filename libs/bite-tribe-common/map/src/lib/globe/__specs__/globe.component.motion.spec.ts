import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { addOutline, globeOutline, removeOutline } from 'ionicons/icons';
import { of } from 'rxjs';
import { GlobeComponent } from '../globe.component';
import {
  GLOBE_OUTLINE_LOADER,
  type GlobeDetail,
} from '../model/globe-outlines';
import { readWorldAtlas } from '../model/__specs__/world-atlas';

@Injectable()
class EmptyTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of({});
  }
}

/** A 2D context that records what the globe paints, and nothing else. */
const recordingContext = (): {
  context: CanvasRenderingContext2D;
  fills: string[];
  dots: number[];
} => {
  const fills: string[] = [];
  const dots: number[] = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn((x: number, y: number, radius: number) => dots.push(radius)),
    fill(): void {
      fills.push(this.fillStyle);
    },
  };

  return {
    context: context as unknown as CanvasRenderingContext2D,
    fills,
    dots,
  };
};

/**
 * The globe's drawing, flights and spin (GitHub issue #1787). jsdom has no
 * canvas and no animation frames of its own, so both are stood in for here:
 * a recording context, and a frame queue the specs run by hand.
 */
describe('GlobeComponent drawing and motion', () => {
  let fixture: ComponentFixture<GlobeComponent>;
  let component: GlobeComponent;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let now: number;
  let reducedMotion: boolean;
  let painted: ReturnType<typeof recordingContext>;
  let loader: jest.Mock<
    Promise<ReturnType<typeof readWorldAtlas>>,
    [GlobeDetail]
  >;

  const runFrames = (count: number): void => {
    for (let frame = 0; frame < count; frame++) {
      now += 16;
      const due = [...frames.values()];

      frames.clear();
      due.forEach((callback) => callback(now));
    }
  };

  const camera = (): { zoom: number; rotation: [number, number] } =>
    component['camera'];

  const render = async (
    countryCodes: string[],
    autoSpin = false,
  ): Promise<void> => {
    fixture = TestBed.createComponent(GlobeComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.setProperty('--globe-visited', 'rgb(1, 2, 3)');
    fixture.nativeElement.style.setProperty('--globe-selected', 'rgb(4, 5, 6)');
    fixture.componentRef.setInput('countryCodes', countryCodes);
    fixture.componentRef.setInput('autoSpin', autoSpin);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  beforeEach(() => {
    addIcons({ addOutline, globeOutline, removeOutline });
    frames = new Map();
    nextFrame = 0;
    now = 0;
    reducedMotion = false;
    painted = recordingContext();

    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(painted.context as unknown as RenderingContext);
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.set(++nextFrame, callback);

        return nextFrame;
      });
    jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id) => frames.delete(id));
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    window.matchMedia = jest.fn(
      () => ({ matches: reducedMotion }) as MediaQueryList,
    );
    loader = jest.fn(async (detail: GlobeDetail) => readWorldAtlas(detail));

    TestBed.configureTestingModule({
      imports: [GlobeComponent],
      providers: [
        { provide: GLOBE_OUTLINE_LOADER, useValue: loader },
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en' },
          loader: EmptyTranslocoLoader,
        }),
      ],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  describe('drawing', () => {
    it('should paint the highlighted countries in the visited colour', async () => {
      await render(['AT']);
      runFrames(1);

      expect(painted.fills).toContain('rgb(1, 2, 3)');
      expect(painted.fills).not.toContain('rgb(4, 5, 6)');
    });

    it('should paint the selected country in the selected colour', async () => {
      await render(['AT']);
      component.selectedCountryCode.set('AT');
      fixture.detectChanges();
      runFrames(1);

      expect(painted.fills).toContain('rgb(4, 5, 6)');
    });

    it('should paint a highlighted country too small to see as a dot', async () => {
      await render(['SG', 'MY']);
      runFrames(1);

      expect(painted.dots).toContain(3);
    });
  });

  describe('flights', () => {
    it('should zoom in one step on the plus button', async () => {
      await render(['AT']);
      component.zoomIn();
      runFrames(30);

      expect(camera().zoom).toBeCloseTo(1.6, 5);
    });

    it('should return to the whole globe on reset', async () => {
      await render(['AT']);
      component.zoomIn();
      runFrames(30);
      component.reset();
      runFrames(60);

      expect(camera().zoom).toBe(1);
    });

    it('should stop a flight the moment the globe is touched', async () => {
      await render(['AT']);
      component.zoomIn();
      runFrames(2);
      component.onPointerDown({
        pointerId: 1,
        offsetX: 0,
        offsetY: 0,
        target: null,
      } as unknown as PointerEvent);
      const zoom = camera().zoom;

      runFrames(30);

      expect(camera().zoom).toBe(zoom);
    });

    it('should turn to a country the host selects', async () => {
      await render(['AT', 'TH']);
      component.selectedCountryCode.set('TH');
      fixture.detectChanges();
      runFrames(60);

      expect(component['camera'].faces([100.5, 13.75])).toBe(true);
      expect(camera().zoom).toBeGreaterThan(1);
    });

    it('should open still on a selection it was given before drawing', async () => {
      fixture = TestBed.createComponent(GlobeComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('countryCodes', ['AT', 'TH']);
      fixture.componentRef.setInput('autoSpin', false);
      fixture.componentRef.setInput('selectedCountryCode', 'TH');
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      runFrames(60);

      expect(camera().zoom).toBe(1);
    });

    it('should jump rather than fly under reduced motion', async () => {
      reducedMotion = true;
      await render(['AT']);
      component.zoomIn();

      expect(camera().zoom).toBeCloseTo(1.6, 5);
    });
  });

  describe('spin', () => {
    it('should spin until the first touch', async () => {
      await render(['AT'], true);
      runFrames(2);
      const before = camera().rotation[0];

      runFrames(30);

      expect(camera().rotation[0]).toBeGreaterThan(before);

      component.onPointerDown({
        pointerId: 1,
        offsetX: 0,
        offsetY: 0,
        target: null,
      } as unknown as PointerEvent);
      const touched = camera().rotation[0];

      runFrames(30);

      expect(camera().rotation[0]).toBe(touched);
    });

    it('should not spin under reduced motion', async () => {
      reducedMotion = true;
      await render(['AT'], true);
      const before = camera().rotation[0];

      runFrames(30);

      expect(camera().rotation[0]).toBe(before);
    });

    it('should stop spinning once destroyed', async () => {
      await render(['AT'], true);
      runFrames(2);
      fixture.destroy();
      const before = camera().rotation[0];

      runFrames(30);

      expect(camera().rotation[0]).toBe(before);
    });
  });

  describe('loading', () => {
    it('should ask for the fine outlines again after a failed load', async () => {
      loader.mockImplementation(async (detail) => {
        if (detail === 'fine') {
          throw new Error('offline');
        }

        return readWorldAtlas(detail);
      });

      await render(['AT']);
      const wheel = {
        deltaY: -1000,
        preventDefault: jest.fn(),
      } as unknown as WheelEvent;

      component.onWheel(wheel);
      await new Promise((resolve) => setTimeout(resolve));
      component.onWheel(wheel);

      expect(
        loader.mock.calls.filter(([detail]) => detail === 'fine'),
      ).toHaveLength(2);
    });
  });
});
