import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Support } from '../support';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig, PATH } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoTestingModule } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

const en = {
  'support-title': 'Support',
  contact: 'Contact',
  email: 'Email',
};

describe(Support.name, () => {
  let component: Support;
  let fixture: ComponentFixture<Support>;

  const render = (): void => {
    fixture = TestBed.createComponent(Support);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const contactButton = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="support-contact"]');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: {
            availableLangs: ['en'],
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
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    render();

    expect(component).toBeTruthy();
  });

  describe('legal links', () => {
    // The App Store publishes this page as the Support URL, so a reviewer can
    // arrive here first. Both legal pages have to be reachable from it, and
    // they are built from PATH so a renamed route cannot silently break them.
    it('should point at the privacy policy and account deletion routes', () => {
      render();

      expect(component.privacyPolicyPath).toBe(`/${PATH.PRIVACY_POLICY}`);
      expect(component.accountDeletionPath).toBe(`/${PATH.ACCOUNT_DELETION}`);
    });
  });

  describe('contact address', () => {
    // Hidden behind a control so it is not scraped from the page source, the
    // same way the privacy policy and account-deletion pages do it.
    it('should be hidden until the contact control is used', () => {
      render();

      expect(component.isContactClicked()).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain(
        'support@bitetribe.app',
      );
      expect(contactButton()).not.toBeNull();
    });

    it('should be shown once the contact control is used', () => {
      render();

      component.contactClicked();
      fixture.detectChanges();

      expect(component.isContactClicked()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain(
        'support@bitetribe.app',
      );
    });
  });

  describe('year', () => {
    describe('given year 2026', () => {
      it('should return 2026', () => {
        const mockDate = new Date('2026-01-01T00:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        render();

        expect(component.year).toBe('2026');
      });
    });
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to Support', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
      render();

      component.ionViewDidEnter();

      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'Support',
      });
    });
  });
});
