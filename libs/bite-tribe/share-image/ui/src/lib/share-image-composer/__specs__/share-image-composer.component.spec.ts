import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { loadBiteImageForCanvas } from 'bite-tribe-common/bite';
import type { Bite } from 'model';
import { ShareImageComposerComponent } from '../share-image-composer.component';

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

  const render = async (creatorName?: string): Promise<HTMLElement> => {
    fixture = TestBed.createComponent(ShareImageComposerComponent);
    fixture.componentRef.setInput('bite', bite);
    fixture.componentRef.setInput('shareImage', shareImage);
    fixture.componentRef.setInput('creatorName', creatorName);
    fixture.detectChanges();
    await flush();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    settleLogo();
    shareImage = jest.fn().mockResolvedValue(undefined);
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

      ['photo', 'dishName', 'place', 'price', 'qr'].forEach((field) =>
        expect(toggle(element, field)).not.toBeNull(),
      );
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
});
