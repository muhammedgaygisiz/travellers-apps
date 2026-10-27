import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { addIcons } from 'ionicons';
import { addOutline, globeOutline, removeOutline } from 'ionicons/icons';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { GlobeComponent, type GlobeCountryTap } from '../globe.component';
import {
  GLOBE_OUTLINE_LOADER,
  type GlobeDetail,
} from '../model/globe-outlines';
import { readWorldAtlas } from '../model/__specs__/world-atlas';

/** The canvas is 420 px square in jsdom, which lays nothing out. */
const MIDDLE = 210;

/** Copied from `en.json`. */
@Injectable()
class GlobeTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of({
      'zoom-in': 'Zoom in',
      'zoom-out': 'Zoom out',
      'show-whole-globe': 'Show the whole globe',
    });
  }
}

const pointer = (
  pointerId: number,
  offsetX: number,
  offsetY: number,
): PointerEvent =>
  ({ pointerId, offsetX, offsetY, target: null }) as unknown as PointerEvent;

describe('GlobeComponent', () => {
  let fixture: ComponentFixture<GlobeComponent>;
  let component: GlobeComponent;
  let loader: jest.Mock<
    ReturnType<typeof readWorldAtlas> extends infer T ? Promise<T> : never,
    [GlobeDetail]
  >;

  const render = async (countryCodes: string[]): Promise<void> => {
    fixture = TestBed.createComponent(GlobeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('countryCodes', countryCodes);
    fixture.componentRef.setInput('autoSpin', false);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  beforeEach(() => {
    addIcons({ addOutline, globeOutline, removeOutline });
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    loader = jest.fn(async (detail: GlobeDetail) => readWorldAtlas(detail));

    TestBed.configureTestingModule({
      imports: [GlobeComponent],
      providers: [
        { provide: GLOBE_OUTLINE_LOADER, useValue: loader },
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en' },
          loader: GlobeTranslocoLoader,
        }),
      ],
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('should load the coarse outlines only, when they draw every country', async () => {
    await render(['AT', 'TH']);

    expect(loader.mock.calls).toEqual([['coarse']]);
    expect(component.ready()).toBe(true);
  });

  it('should load the fine outlines for a country the coarse set lacks', async () => {
    await render(['SG']);

    expect(loader).toHaveBeenCalledWith('fine');
  });

  it('should turn to face a country only the fine outlines draw', async () => {
    await render(['SG', 'MT', 'MY']);
    await new Promise((resolve) => setTimeout(resolve));

    // Valletta: Malta is too small for the coarse outlines.
    expect(component['camera'].faces([14.5, 35.9])).toBe(true);
  });

  it('should report a tap on a highlighted country and select it', async () => {
    const taps: GlobeCountryTap[] = [];

    await render(['AT']);
    component.countryTap.subscribe((tap) => taps.push(tap));

    component.onPointerDown(pointer(1, MIDDLE, MIDDLE));
    component.onPointerUp(pointer(1, MIDDLE, MIDDLE));

    expect(taps).toEqual([{ countryCode: 'AT', visited: true }]);
    expect(component.selectedCountryCode()).toBe('AT');
  });

  it('should not treat a drag as a tap', async () => {
    const taps: GlobeCountryTap[] = [];

    await render(['AT']);
    component.countryTap.subscribe((tap) => taps.push(tap));

    component.onPointerDown(pointer(1, MIDDLE, MIDDLE));
    component.onPointerMove(pointer(1, MIDDLE + 40, MIDDLE));
    component.onPointerUp(pointer(1, MIDDLE + 40, MIDDLE));

    expect(taps).toEqual([]);
  });

  it('should report a button zoom as a button zoom', async () => {
    const zooms: string[] = [];

    await render(['AT']);
    component.zoomed.subscribe((control) => zooms.push(control));
    component.zoomIn();
    component.zoomOut();

    expect(zooms).toEqual(['button', 'button']);
  });

  it('should report a wheel zoom as a gesture, and load the fine outlines when close', async () => {
    const zooms: string[] = [];

    await render(['AT']);
    component.zoomed.subscribe((control) => zooms.push(control));
    component.onWheel({
      deltaY: -1000,
      preventDefault: jest.fn(),
    } as unknown as WheelEvent);

    expect(zooms).toEqual(['gesture']);
    expect(loader).toHaveBeenCalledWith('fine');
  });

  it('should report a pinch as a gesture', async () => {
    const zooms: string[] = [];

    await render(['AT']);
    component.zoomed.subscribe((control) => zooms.push(control));
    component.onPointerDown(pointer(1, MIDDLE - 20, MIDDLE));
    component.onPointerDown(pointer(2, MIDDLE + 20, MIDDLE));
    component.onPointerMove(pointer(2, MIDDLE + 60, MIDDLE));

    expect(zooms).toEqual(['gesture']);
  });

  it('should clear the selection on reset', async () => {
    await render(['AT']);
    component.selectedCountryCode.set('AT');
    component.reset();

    expect(component.selectedCountryCode()).toBeUndefined();
  });

  it('should offer zoom in, zoom out and the whole globe as labelled buttons', async () => {
    await render(['AT']);

    const labels = ['globe-zoom-in', 'globe-zoom-out', 'globe-reset'].map(
      (id) =>
        fixture.nativeElement
          .querySelector(`[data-testid="${id}"]`)
          ?.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Zoom in', 'Zoom out', 'Show the whole globe']);
  });
});
