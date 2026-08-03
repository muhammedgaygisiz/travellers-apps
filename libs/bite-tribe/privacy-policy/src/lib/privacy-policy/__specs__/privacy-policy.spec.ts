import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PrivacyPolicy } from '../privacy-policy';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

// A real Transloco instance rather than a stubbed service: which language the
// legal document renders in is the behaviour under test, so the keys have to
// resolve against per-language translations (issue #1218).
const en = {
  'privacy-policy-title': 'Privacy Policy for BiteTribe',
  'privacy-policy-language-fallback':
    'This Privacy Policy is not yet available in your app language, so it is shown in English.',
};

const de = {
  'privacy-policy-title': 'Datenschutzerklärung für BiteTribe',
  'privacy-policy-language-fallback':
    'Diese Datenschutzerklärung ist noch nicht in deiner App-Sprache verfügbar und wird daher auf Englisch angezeigt.',
};

const fr = {
  'privacy-policy-title': 'NOT TRANSLATED',
  'privacy-policy-language-fallback':
    'Cette politique de confidentialité n’est pas encore disponible dans la langue de votre application ; elle est donc affichée en anglais.',
};

describe(PrivacyPolicy.name, () => {
  let component: PrivacyPolicy;
  let fixture: ComponentFixture<PrivacyPolicy>;

  const renderWithAppLanguage = (lang: string): void => {
    TestBed.inject(TranslocoService).setActiveLang(lang);

    fixture = TestBed.createComponent(PrivacyPolicy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const title = (): string =>
    fixture.nativeElement.querySelector('h1')?.textContent?.trim() ?? '';

  const fallbackNotice = (): HTMLElement | null =>
    fixture.nativeElement.querySelector(
      '[data-testid="privacy-policy-language-fallback"]',
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en, de, fr },
          translocoConfig: {
            availableLangs: ['en', 'de', 'fr'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    renderWithAppLanguage('en');

    expect(component).toBeTruthy();
  });

  describe('policy language', () => {
    describe('given the app language is English', () => {
      it('should show the English policy without a fallback notice', () => {
        renderWithAppLanguage('en');

        expect(title()).toBe(en['privacy-policy-title']);
        expect(component.isLanguageFallback()).toBe(false);
        expect(fallbackNotice()).toBeNull();
      });
    });

    describe('given the app language is German', () => {
      it('should show the German policy without a fallback notice', () => {
        renderWithAppLanguage('de');

        expect(title()).toBe(de['privacy-policy-title']);
        expect(component.isLanguageFallback()).toBe(false);
        expect(fallbackNotice()).toBeNull();
      });
    });

    describe('given the app language has no reviewed policy', () => {
      it('should show the English policy and disclose the fallback in the app language', () => {
        renderWithAppLanguage('fr');

        expect(title()).toBe(en['privacy-policy-title']);
        expect(component.isLanguageFallback()).toBe(true);
        expect(fallbackNotice()?.textContent?.trim()).toBe(
          fr['privacy-policy-language-fallback'],
        );
      });
    });

    describe('given the app language arrives after the first render', () => {
      it('should rebuild the document in the reviewed policy language', () => {
        renderWithAppLanguage('fr');
        expect(title()).toBe(en['privacy-policy-title']);

        TestBed.inject(TranslocoService).setActiveLang('de');
        fixture.detectChanges();

        expect(title()).toBe(de['privacy-policy-title']);
        expect(fallbackNotice()).toBeNull();
      });
    });

    describe('given a regional app language of a reviewed policy', () => {
      it('should show that reviewed policy', () => {
        renderWithAppLanguage('de-CH');

        expect(component.policyLang()).toBe('de|static');
        expect(component.isLanguageFallback()).toBe(false);
      });
    });
  });

  describe('year', () => {
    describe('given year 2026', () => {
      it('should return 2026', () => {
        const mockDate = new Date('2026-01-01T00:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        renderWithAppLanguage('en');

        expect(component.year).toBe('2026');
      });
    });
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to Privacy Policy', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
      renderWithAppLanguage('en');

      component.ionViewDidEnter();

      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'Privacy Policy',
      });
    });
  });

  describe('contactClicked', () => {
    it('should set isContactClicked to true', () => {
      renderWithAppLanguage('en');

      expect(component.isContactClicked()).toBe(false);

      component.contactClicked();

      expect(component.isContactClicked()).toBe(true);
    });
  });
});
