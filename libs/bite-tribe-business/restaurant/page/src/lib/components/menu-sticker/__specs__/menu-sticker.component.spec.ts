import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { qrCode } from 'common/ui/qr-code';
import { MenuStickerComponent } from '../menu-sticker.component';

/**
 * The strings these tests read, really translated: a missing key renders as
 * the key itself, which would pass an assertion that proves nothing.
 */
const EN = {
  'menu-sticker-brand': 'BiteTribe',
  'menu-sticker-call-to-action': 'Scan for our menu on BiteTribe',
  'menu-sticker-get-the-app': 'Get the app: {{address}}',
};

const URL = 'https://bitetribe.app/m/restaurant-1';

describe('MenuStickerComponent', () => {
  let fixture: ComponentFixture<MenuStickerComponent>;
  let ref: ComponentRef<MenuStickerComponent>;

  const all = (testId: string): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
    );

  const render = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: EN },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
    });

    fixture = TestBed.createComponent(MenuStickerComponent);
    ref = fixture.componentRef;
    render({ format: 'door', url: URL, restaurantName: 'Sakura Kitchen' });
  });

  describe('the door sticker', () => {
    it('encodes the public menu address', () => {
      const paths = all('qr-code').map((svg) =>
        svg.querySelector('path')?.getAttribute('d'),
      );

      expect(paths).toEqual([qrCode(URL).path]);
    });

    it('carries the mark, the name, the call to action and the download line', () => {
      const text = all('menu-sticker-door')[0]?.textContent ?? '';

      expect(text).toContain('BiteTribe');
      expect(text).toContain('Sakura Kitchen');
      expect(text).toContain('Scan for our menu on BiteTribe');
      expect(all('menu-sticker-download')[0]?.textContent?.trim()).toBe(
        'Get the app: bitetribe.app/download',
      );
    });

    it('carries both store badges', () => {
      const badges = Array.from(
        fixture.nativeElement.querySelectorAll('img.badge'),
      ).map((img) => (img as HTMLImageElement).getAttribute('src'));

      expect(badges).toEqual([
        'assets/store/app-store-badge-black.svg',
        'assets/store/google-play-badge.png',
      ]);
    });

    /** The state while the restaurant document is still being read. */
    it('leaves the name out rather than printing an empty line', () => {
      render({ restaurantName: '' });

      expect(all('menu-sticker-name')).toEqual([]);
    });
  });

  describe('the table tent', () => {
    beforeEach(() => render({ format: 'tent' }));

    it('has two faces with the same code', () => {
      const paths = all('qr-code').map((svg) =>
        svg.querySelector('path')?.getAttribute('d'),
      );

      expect(all('menu-sticker-tent-face')).toHaveLength(2);
      expect(paths).toEqual([qrCode(URL).path, qrCode(URL).path]);
    });

    /**
     * The lower face says nothing the upper one does not, so a screen reader
     * reads the card once.
     */
    it('hides the upside-down face from screen readers', () => {
      const [upper, lower] = all('menu-sticker-tent-face');

      expect(upper.getAttribute('aria-hidden')).toBeNull();
      expect(lower.getAttribute('aria-hidden')).toBe('true');
      expect(lower.classList).toContain('tent-face-lower');
    });
  });
});
