import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Capacitor } from '@capacitor/core';
import { of } from 'rxjs';
import { AnalyticsService } from 'ta-firestore';
import { StoreLinksComponent } from '../store-links.component';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../store-links';

// Mocked rather than spied on: `Capacitor` is a Capacitor namespace, and the
// platform answer has to be in place before the component is constructed. The
// rest of the module stays real, because `ta-firestore` registers its plugins
// through it at import time.
jest.mock('@capacitor/core', () => ({
  ...jest.requireActual('@capacitor/core'),
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
}));

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;

const logEvent = jest.fn();

const createComponent = (
  surface: 'start' | 'public_menu' | 'about' = 'start',
): ComponentFixture<StoreLinksComponent> => {
  TestBed.configureTestingModule({
    providers: [
      { provide: TranslocoService, useValue: MockTranslocoService },
      { provide: AnalyticsService, useValue: { logEvent } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(StoreLinksComponent);
  fixture.componentRef.setInput('surface', surface);
  fixture.detectChanges();

  return fixture;
};

const href = (
  fixture: ComponentFixture<StoreLinksComponent>,
  testId: string,
): string | null | undefined =>
  fixture.nativeElement
    .querySelector(`[data-testid="${testId}"]`)
    ?.getAttribute('href');

describe(StoreLinksComponent.name, () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    isNativePlatform.mockReset();
    logEvent.mockReset();
  });

  describe('on the web', () => {
    beforeEach(() => isNativePlatform.mockReturnValue(false));

    it('should link to the App Store listing', () => {
      expect(href(createComponent(), 'store-links-app-store')).toBe(
        APP_STORE_URL,
      );
    });

    it('should link to the Play listing', () => {
      expect(href(createComponent(), 'store-links-google-play')).toBe(
        GOOGLE_PLAY_URL,
      );
    });

    // Issue #1759: a visitor the web hands to a store is the web working, and
    // the funnel can only say so if the hand-off is logged with its page.
    it.each([
      ['store-links-app-store', 'app_store'],
      ['store-links-google-play', 'google_play'],
    ])(
      'should log which store %s leads to, and from which page',
      (testId, store) => {
        const fixture = createComponent('public_menu');
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
          `[data-testid="${testId}"]`,
        );

        // The real anchor would open a new tab; the click handler is what is
        // under test.
        link.addEventListener('click', (event) => event.preventDefault());
        link.click();

        expect(logEvent).toHaveBeenCalledTimes(1);
        expect(logEvent).toHaveBeenCalledWith('store_link_clicked', {
          store,
          surface: 'public_menu',
        });
      },
    );

    it('should log nothing until a link is followed', () => {
      createComponent();

      expect(logEvent).not.toHaveBeenCalled();
    });
  });

  // The acceptance criterion the component exists for: a native build must not
  // offer the user the store they installed from.
  describe('on a native platform', () => {
    beforeEach(() => isNativePlatform.mockReturnValue(true));

    it('should render nothing at all', () => {
      const fixture = createComponent();

      expect(
        fixture.nativeElement.querySelector('[data-testid="store-links"]'),
      ).toBeNull();
    });
  });
});
