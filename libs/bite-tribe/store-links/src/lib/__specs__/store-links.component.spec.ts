import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Capacitor } from '@capacitor/core';
import { of } from 'rxjs';
import { StoreLinksComponent } from '../store-links.component';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../store-links';

// Mocked rather than spied on: `Capacitor` is a Capacitor namespace, and the
// platform answer has to be in place before the component is constructed.
jest.mock('@capacitor/core', () => ({
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

const createComponent = (): ComponentFixture<StoreLinksComponent> => {
  TestBed.configureTestingModule({
    providers: [{ provide: TranslocoService, useValue: MockTranslocoService }],
  }).compileComponents();

  const fixture = TestBed.createComponent(StoreLinksComponent);
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
