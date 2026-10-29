import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { loadBiteImageForCanvas } from 'bite-tribe-common/bite';
import type { Bite } from 'model';
import {
  hasMoreBelow,
  rasterise,
  ShareImageComposerComponent,
} from '../share-image-composer.component';

jest.mock('bite-tribe-common/bite', () => ({
  loadBiteImageForCanvas: jest.fn(),
}));

const loadPhoto = loadBiteImageForCanvas as jest.MockedFunction<
  typeof loadBiteImageForCanvas
>;

const bite: Bite = {
  id: 'bite-1',
  name: 'Pad thai',
  image: '',
  imagePath: 'https://storage.example/photo.jpg',
  place: 'Som Tam Nua',
  price: 120,
  currency: 'THB',
  position: { latitude: 0, longitude: 0 },
};

const exported = new Blob(['jpeg'], { type: 'image/jpeg' });

/** The logo loads through a plain Image, which jsdom never fetches. */
const settleLogo = (): void => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'src',
  );

  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    set(this: HTMLImageElement) {
      queueMicrotask(() => this.onload?.(new Event('load')));
    },
    get: original?.get,
  });
};

/**
 * Lets the composer's asynchronous start-up finish. Zoneless change detection
 * does not track a promise started in ngOnInit, so `whenStable` alone returns
 * before the photo has settled.
 */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  await fixture.whenStable();
};

let fixture: ComponentFixture<ShareImageComposerComponent>;

describe(ShareImageComposerComponent.name, () => {
  let shareImage: jest.Mock;
  let saveImage: jest.Mock;

  const render = async (creatorName?: string): Promise<HTMLElement> => {
    fixture = TestBed.createComponent(ShareImageComposerComponent);
    fixture.componentRef.setInput('bite', bite);
    fixture.componentRef.setInput('shareImage', shareImage);
    fixture.componentRef.setInput('saveImage', saveImage);
    fixture.componentRef.setInput('creatorName', creatorName);
    fixture.detectChanges();
    await flush();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    settleLogo();
    shareImage = jest.fn().mockResolvedValue(undefined);
    saveImage = jest.fn().mockResolvedValue(undefined);
    loadPhoto.mockResolvedValue({ width: 10, height: 10 } as HTMLImageElement);

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(exported));

    await TestBed.configureTestingModule({
      imports: [
        ShareImageComposerComponent,
        TranslocoTestingModule.forRoot({ langs: { en: {} } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows the preview once the photo has loaded', async () => {
    const element = await render();

    expect(loadPhoto).toHaveBeenCalledWith(bite);
    expect(
      element.querySelector('[data-testid="share-image-preview"]'),
    ).not.toBeNull();
    expect(
      element.querySelector('[data-testid="share-image-photo-failed"]'),
    ).toBeNull();
  });

  it('says so when the photo could not be loaded, and still shows the image', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    loadPhoto.mockRejectedValue(new Error('tainted'));

    const element = await render();

    expect(
      element.querySelector('[data-testid="share-image-photo-failed"]'),
    ).not.toBeNull();
    expect(
      element.querySelector('[data-testid="share-image-preview"]'),
    ).not.toBeNull();
  });

  it('hands the exported preview to shareImage', async () => {
    const element = await render();

    (
      element.querySelector('[data-testid="share-image-share"]') as HTMLElement
    ).click();
    await flush();

    expect(shareImage).toHaveBeenCalledWith(exported);
  });

  it('hands the exported preview to saveImage', async () => {
    const element = await render();

    (
      element.querySelector('[data-testid="share-image-save"]') as HTMLElement
    ).click();
    await flush();

    expect(saveImage).toHaveBeenCalledWith(exported);
    expect(shareImage).not.toHaveBeenCalled();
  });

  it('hands over one image at a time, however often the action is tapped', async () => {
    saveImage.mockReturnValue(new Promise(() => undefined));
    const element = await render();
    const save = element.querySelector(
      '[data-testid="share-image-save"]',
    ) as HTMLElement;

    save.click();
    await flush();
    save.click();
    (
      element.querySelector('[data-testid="share-image-share"]') as HTMLElement
    ).click();
    await flush();

    expect(saveImage).toHaveBeenCalledTimes(1);
    expect(shareImage).not.toHaveBeenCalled();
  });

  it('offers no Share action without a share handler', async () => {
    shareImage = undefined as unknown as jest.Mock;
    const element = await render();

    expect(
      element.querySelector('[data-testid="share-image-share"]'),
    ).toBeNull();
    expect(
      element.querySelector('[data-testid="share-image-save"]'),
    ).not.toBeNull();
  });

  it('watches the stage and the modal for size changes, until destroyed', async () => {
    const observed: Element[] = [];
    const disconnect = jest.fn();
    const globals = globalThis as unknown as { ResizeObserver?: unknown };
    const original = globals.ResizeObserver;

    // jsdom has no ResizeObserver; this one only records what it was given.
    globals.ResizeObserver = class {
      observe = (element: Element): number => observed.push(element);
      disconnect = disconnect;
    };

    try {
      const element = await render();

      expect(observed).toEqual([element.querySelector('.stage'), element]);

      fixture.destroy();

      expect(disconnect).toHaveBeenCalled();
    } finally {
      globals.ResizeObserver = original;
    }
  });

  /** The "More options" cue (issue #1731). */
  describe('more options cue', () => {
    const cue = (element: HTMLElement): HTMLElement | null =>
      element.querySelector('[data-testid="share-image-more-options"]');

    /** A scroll element with controls hidden below, scrolled `scrollTop` down. */
    const scrollWithMoreBelow = (scrollTop = 0): HTMLElement =>
      Object.assign(document.createElement('div'), {
        scrollTop,
        getBoundingClientRect: () => ({ top: 100 }) as DOMRect,
      });

    beforeEach(() => {
      jest
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockReturnValue(1400);
      jest
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockReturnValue(700);
    });

    it('scrolls the first control into view when tapped', async () => {
      const scroll = scrollWithMoreBelow();
      jest
        .spyOn(IonContent.prototype, 'getScrollElement')
        .mockResolvedValue(scroll);
      const scrollToPoint = jest
        .spyOn(IonContent.prototype, 'scrollToPoint')
        .mockResolvedValue(undefined);
      const element = await render();
      // The cue is measured once the stage has rendered, a turn after start-up.
      await flush();
      jest
        .spyOn(
          element.querySelector('.layouts') as HTMLElement,
          'getBoundingClientRect',
        )
        .mockReturnValue({ top: 600 } as DOMRect);

      cue(element)?.click();
      await flush();

      // 500px below the top of the scroll element, less the 8px of air.
      expect(scrollToPoint).toHaveBeenCalledWith(0, 492, 300);
    });

    it('does not show where the content cannot be measured', async () => {
      jest
        .spyOn(IonContent.prototype, 'getScrollElement')
        .mockRejectedValue(new Error('not upgraded'));

      const element = await render();
      await flush();

      expect(cue(element)).toBeNull();
    });
  });

  it('closes on cancel', async () => {
    const element = await render();
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);

    (
      element.querySelector('[data-testid="share-image-close"]') as HTMLElement
    ).click();

    expect(closed).toHaveBeenCalled();
  });

  /** The field switches (UC-SBS R-6, R-8, issue #1728). */
  describe('field switches', () => {
    const toggle = (element: HTMLElement, field: string): HTMLElement | null =>
      element.querySelector(`[data-testid="share-image-field-${field}"]`);

    const drawnContent = (): Record<string, unknown> =>
      (
        fixture.componentInstance as unknown as {
          content: () => Record<string, unknown>;
        }
      ).content();

    it('offers a switch for each field the Bite has, and none for the rest', async () => {
      const element = await render();

      ['photo', 'dishName', 'place', 'price'].forEach((field) =>
        expect(toggle(element, field)).not.toBeNull(),
      );
      // The QR code is on every image, so it has no switch.
      expect(toggle(element, 'qr')).toBeNull();
      // The fixture has no rating, and no public name was passed.
      expect(toggle(element, 'rating')).toBeNull();
      expect(toggle(element, 'creatorName')).toBeNull();
    });

    it('offers the name switch for a public name, switched off', async () => {
      const element = await render('Super Mario');
      const nameToggle = toggle(element, 'creatorName') as HTMLIonToggleElement;

      expect(nameToggle).not.toBeNull();
      expect(nameToggle.checked).toBe(false);
      expect(drawnContent()['creatorName']).toBeUndefined();
    });

    it('takes a field off the image when its switch is turned off', async () => {
      const element = await render();

      toggle(element, 'price')?.dispatchEvent(
        new CustomEvent('ionChange', { detail: { checked: false } }),
      );
      fixture.detectChanges();

      expect(drawnContent()['price']).toBeUndefined();
      expect(drawnContent()['dishName']).toBe('Pad thai');
    });

    it('puts the name on the image when its switch is turned on', async () => {
      const element = await render('Super Mario');

      toggle(element, 'creatorName')?.dispatchEvent(
        new CustomEvent('ionChange', { detail: { checked: true } }),
      );
      fixture.detectChanges();

      expect(drawnContent()['creatorName']).toBe('Super Mario');
    });
  });

  /** The layout and colours (UC-SBS R-32, R-33, issue #1731). */
  describe('style', () => {
    const drawnStyle = (): Record<string, string> =>
      (
        fixture.componentInstance as unknown as {
          imageStyle: () => Record<string, string>;
        }
      ).imageStyle();

    const click = (element: HTMLElement, testId: string): void => {
      (
        element.querySelector(`[data-testid="${testId}"]`) as HTMLElement
      ).click();
      fixture.detectChanges();
    };

    it('starts on Classic, Night and White', async () => {
      await render();

      expect(drawnStyle()).toEqual({
        layout: 'classic',
        background: 'night',
        text: 'white',
      });
    });

    it('switches the layout from the segment', async () => {
      const element = await render();

      element
        .querySelector('[data-testid="share-image-layouts"]')
        ?.dispatchEvent(
          new CustomEvent('ionChange', { detail: { value: 'wide' } }),
        );
      fixture.detectChanges();

      expect(drawnStyle()['layout']).toBe('wide');
    });

    /** For the share funnel's analytics (issue #1733). */
    it('reports each layout the user picks, and not the one already showing', async () => {
      const element = await render();
      const chosen: string[] = [];
      fixture.componentInstance.layoutChosen.subscribe((layout) =>
        chosen.push(layout),
      );
      const segment = element.querySelector(
        '[data-testid="share-image-layouts"]',
      ) as HTMLElement;
      const pick = (value: string): void => {
        segment.dispatchEvent(
          new CustomEvent('ionChange', { detail: { value } }),
        );
        fixture.detectChanges();
      };
      const preview = element.querySelector(
        '[data-testid="share-image-swipe"]',
      ) as HTMLElement;

      pick('classic');
      pick('wide');
      pick('wide');
      preview.dispatchEvent(new MouseEvent('pointerdown', { clientX: 300 }));
      preview.dispatchEvent(new MouseEvent('pointerup', { clientX: 100 }));

      expect(chosen).toEqual(['wide', 'classic']);
    });

    it('steps through the layouts with a horizontal swipe', async () => {
      const element = await render();
      const preview = element.querySelector(
        '[data-testid="share-image-swipe"]',
      ) as HTMLElement;
      const swipe = (from: number, to: number): void => {
        preview.dispatchEvent(new MouseEvent('pointerdown', { clientX: from }));
        preview.dispatchEvent(new MouseEvent('pointerup', { clientX: to }));
        fixture.detectChanges();
      };

      swipe(300, 100);
      expect(drawnStyle()['layout']).toBe('wide');

      swipe(100, 300);
      expect(drawnStyle()['layout']).toBe('classic');

      // A tap, or a short drag, changes nothing.
      swipe(200, 180);
      expect(drawnStyle()['layout']).toBe('classic');

      // Nor does a release whose press began outside the preview.
      preview.dispatchEvent(new MouseEvent('pointerup', { clientX: 0 }));
      fixture.detectChanges();
      expect(drawnStyle()['layout']).toBe('classic');
    });

    it('leaves the layout alone when a vertical drag scrolls the content', async () => {
      const element = await render();
      const preview = element.querySelector(
        '[data-testid="share-image-swipe"]',
      ) as HTMLElement;
      const press = (type: string, clientX: number, clientY: number): void => {
        preview.dispatchEvent(new MouseEvent(type, { clientX, clientY }));
        fixture.detectChanges();
      };

      // The browser takes the drag over as a scroll, and cancels the press
      // with coordinates far from where it began.
      press('pointerdown', 200, 500);
      press('pointercancel', 0, 0);
      press('pointerup', 0, 0);
      expect(drawnStyle()['layout']).toBe('classic');

      // A drag that is more vertical than horizontal is no swipe either.
      press('pointerdown', 200, 500);
      press('pointerup', 140, 200);
      expect(drawnStyle()['layout']).toBe('classic');
    });

    it('offers every background, and only the legible text colours', async () => {
      const element = await render();
      const ids = (prefix: string): string[] =>
        [...element.querySelectorAll(`[data-testid^="${prefix}"]`)].map(
          (swatch) =>
            (swatch.getAttribute('data-testid') ?? '').replace(prefix, ''),
        );

      expect(ids('share-image-background-')).toEqual([
        'night',
        'dusk',
        'ocean',
        'sunset',
        'paper',
      ]);
      expect(ids('share-image-text-colour-')).toEqual([
        'white',
        'cream',
        'honey',
      ]);

      click(element, 'share-image-background-paper');

      expect(ids('share-image-text-colour-')).toEqual(['ink', 'cocoa']);
    });

    it('switches to a legible text colour when the background makes the current one illegible', async () => {
      const element = await render();

      click(element, 'share-image-text-colour-honey');
      click(element, 'share-image-background-sunset');

      expect(drawnStyle()).toEqual({
        layout: 'classic',
        background: 'sunset',
        text: 'ink',
      });
    });

    it('keeps the layout when the colours change', async () => {
      const element = await render();

      element
        .querySelector('[data-testid="share-image-layouts"]')
        ?.dispatchEvent(
          new CustomEvent('ionChange', { detail: { value: 'wide' } }),
        );
      click(element, 'share-image-background-ocean');
      click(element, 'share-image-text-colour-cream');

      expect(drawnStyle()).toEqual({
        layout: 'wide',
        background: 'ocean',
        text: 'cream',
      });
    });
  });
});

/** The "More options" cue below the preview. */
describe(hasMoreBelow.name, () => {
  it('shows while the content is at its top and controls are hidden below', () => {
    expect(
      hasMoreBelow({ scrollTop: 0, scrollHeight: 1400, clientHeight: 700 }),
    ).toBe(true);
  });

  it('goes away once the user has scrolled', () => {
    expect(
      hasMoreBelow({ scrollTop: 200, scrollHeight: 1400, clientHeight: 700 }),
    ).toBe(false);
  });

  it('does not show when everything already fits', () => {
    expect(
      hasMoreBelow({ scrollTop: 0, scrollHeight: 710, clientHeight: 700 }),
    ).toBe(false);
  });
});

/** The logo, drawn once at its own size before the template scales it. */
describe(rasterise.name, () => {
  const logo = { width: 685, height: 885 } as HTMLImageElement;

  afterEach(() => jest.restoreAllMocks());

  it('draws the image at its own size onto a canvas of that size', () => {
    const drawImage = jest.fn();
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);

    const result = rasterise(logo);

    expect(result).toBeInstanceOf(HTMLCanvasElement);
    expect(result.width).toBe(685);
    expect(result.height).toBe(885);
    expect(drawImage).toHaveBeenCalledWith(logo, 0, 0, 685, 885);
  });

  it('returns the image itself without a 2D context', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(rasterise(logo)).toBe(logo);
  });
});
