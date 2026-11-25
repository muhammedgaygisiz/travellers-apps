import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { qrCode } from 'common/ui/qr-code';
import { MenuQrComponent } from '../menu-qr.component';

addNecessaryIcons();

/**
 * The two labels the copy button swaps between, and nothing else. A missing
 * key renders as the key itself, which is a passing assertion that proves
 * nothing - so the keys these tests read are really translated.
 */
const EN = {
  'menu-qr-copy': 'Copy link',
  'menu-qr-copied': 'Copied',
};

const RESTAURANT_ID = 'restaurant-1';
const URL = `https://bitetribe.app/m/${RESTAURANT_ID}`;

describe('MenuQrComponent', () => {
  let fixture: ComponentFixture<MenuQrComponent>;
  let ref: ComponentRef<MenuQrComponent>;
  let writeText: jest.Mock;

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    writeText = jest.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: EN },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(MenuQrComponent);
    ref = fixture.componentRef;
    setInputs({ restaurantId: RESTAURANT_ID, hasMenu: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('encodes the published menu address of its restaurant', () => {
    const svg = fixture.nativeElement.querySelector(
      '[data-testid="qr-code"] path',
    );

    expect(svg?.getAttribute('d')).toBe(qrCode(URL).path);
  });

  /**
   * The half of this block that needs no printer. A restaurant publishes the
   * same address on a Google listing or an Instagram bio, where a QR code
   * would be the wrong control entirely.
   */
  it('shows the address as text beside the code', () => {
    expect(query('menu-qr-url')?.textContent?.trim()).toBe(URL);
  });

  it('copies the address to the clipboard', async () => {
    query('menu-qr-copy')?.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it('says it copied, and then stops saying so', async () => {
    query('menu-qr-copy')?.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(query('menu-qr-copy')?.textContent).toContain('Copied');

    jest.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(query('menu-qr-copy')?.textContent).toContain('Copy link');
  });

  /**
   * A refused clipboard - an insecure origin, or a permission the owner
   * declined - must not take the block down with it. The address is on screen
   * either way, and can be selected by hand.
   */
  it('survives a browser that refuses the clipboard', async () => {
    writeText.mockRejectedValue(new Error('denied'));

    query('menu-qr-copy')?.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(query('menu-qr-url')?.textContent?.trim()).toBe(URL);
    expect(query('menu-qr-copy')?.textContent).toContain('Copy link');
  });

  describe('printing', () => {
    let printedAs: (string | undefined)[];

    beforeEach(() => {
      printedAs = [];
      jest
        .spyOn(window, 'print')
        .mockImplementation(() =>
          printedAs.push(fixture.nativeElement.dataset.print),
        );
    });

    afterEach(() => jest.restoreAllMocks());

    /**
     * The print stylesheets keep only the format named on the host, so the
     * attribute has to be there while the print job lays the page out.
     */
    it.each([
      ['menu-qr-print', 'code'],
      ['menu-qr-print-door', 'door'],
      ['menu-qr-print-tent', 'tent'],
    ])('%s prints the %s format', (button, format) => {
      query(button)?.click();

      expect(printedAs).toEqual([format]);
    });

    /** Afterwards the browser's own print command prints the plain code. */
    it('forgets the format once the print job is done', () => {
      query('menu-qr-print-door')?.click();
      window.dispatchEvent(new Event('afterprint'));

      expect(fixture.nativeElement.dataset.print).toBeUndefined();
    });
  });

  it('shows the door sticker and the table tent for the same address', () => {
    const stickers = Array.from(
      fixture.nativeElement.querySelectorAll('bt-business-menu-sticker'),
    ) as HTMLElement[];

    expect(stickers.map((sticker) => sticker.dataset.format)).toEqual([
      'door',
      'tent',
    ]);
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="qr-code"]'),
    ).toHaveLength(4);
  });

  /**
   * A code for a restaurant with no menu resolves to the public page's
   * `menuMissing` refusal. That is an honest answer to a scan and a poor thing
   * to have printed and glued to a window, so there is nothing to print yet.
   */
  describe('a restaurant with no menu', () => {
    beforeEach(() => setInputs({ hasMenu: false }));

    it('says what is missing instead of drawing a code', () => {
      expect(query('menu-qr-no-menu')).not.toBeNull();
      expect(query('qr-code')).toBeNull();
    });

    it('offers neither the address nor the print button', () => {
      expect(query('menu-qr-url')).toBeNull();
      expect(query('menu-qr-print')).toBeNull();
    });

    it('offers no sticker and no table tent', () => {
      expect(
        fixture.nativeElement.querySelector('bt-business-menu-sticker'),
      ).toBeNull();
      expect(query('menu-qr-print-door')).toBeNull();
      expect(query('menu-qr-print-tent')).toBeNull();
    });
  });
});
