import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartComponent } from '../start.component';
import { provideRouter } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { STORE_SERVICE } from 'utils';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BiteTribeStartComponent', () => {
  let component: StartComponent;
  let fixture: ComponentFixture<StartComponent>;
  let store: {
    loginFailed: WritableSignal<boolean>;
    loginPending: WritableSignal<boolean>;
    loginWithGoogleAccount: jest.Mock;
    loginWithAppleAccount: jest.Mock;
    login: jest.Mock;
  };

  const element = (): HTMLElement => fixture.nativeElement;
  const providerIds = (): (string | null)[] =>
    [...element().querySelectorAll('.providers ion-button')].map((button) =>
      button.getAttribute('data-testid'),
    );
  const tap = (testId: string): void => {
    element().querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    store = {
      loginFailed: signal(false),
      loginPending: signal(false),
      loginWithGoogleAccount: jest.fn(),
      loginWithAppleAccount: jest.fn(),
      login: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: STORE_SERVICE, useValue: store },
      ],
    });

    fixture = TestBed.createComponent(StartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('on the web', () => {
    it('makes signing up the primary action', () => {
      const signUp = element().querySelector('[data-testid="start-sign-up"]');

      expect(
        element().querySelector('[data-testid="start-landing"]'),
      ).not.toBeNull();
      expect(signUp?.getAttribute('routerLink')).toBe('/registration');
      expect(signUp?.getAttribute('fill')).toBeNull();
      expect(
        element()
          .querySelector('[data-testid="start-log-in"]')
          ?.getAttribute('href'),
      ).toBe('/login');
    });

    it('says what BiteTribe is before asking for anything', () => {
      expect(element().querySelector('.headline')).not.toBeNull();
      expect(element().querySelectorAll('.benefits li')).toHaveLength(3);
    });

    it('offers Google before Apple, below the sign-up button', () => {
      expect(providerIds()).toEqual(['start-google', 'start-apple']);
      expect(
        element()
          .querySelector('[data-testid="start-sign-up"]')
          ?.compareDocumentPosition(
            element().querySelector('.providers') as Node,
          ),
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('in the iOS app', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('platform', 'ios');
      fixture.detectChanges();
    });

    it('keeps the logo and the email buttons', () => {
      const emailButtons = [
        ...element().querySelectorAll('ion-button[routerLink]'),
      ];

      expect(
        element().querySelector('[data-testid="start-landing"]'),
      ).toBeNull();
      expect(element().querySelector('.tagline')).not.toBeNull();
      expect(
        emailButtons.map((button) => button.getAttribute('routerLink')),
      ).toEqual(['/login', '/registration']);
      expect(emailButtons[1].getAttribute('fill')).toBe('outline');
    });

    it('offers Apple before Google, above the email buttons', () => {
      expect(providerIds()).toEqual(['start-apple', 'start-google']);
      expect(
        element()
          .querySelector('.providers')
          ?.compareDocumentPosition(
            element().querySelector('ion-button[routerLink]') as Node,
          ),
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('in the Android app', () => {
    it('offers Google before Apple', () => {
      fixture.componentRef.setInput('platform', 'android');
      fixture.detectChanges();

      expect(
        element().querySelector('[data-testid="start-landing"]'),
      ).toBeNull();
      expect(providerIds()).toEqual(['start-google', 'start-apple']);
    });
  });

  describe('signing in with a provider', () => {
    it('runs the same sign-in as the login page', () => {
      tap('start-google');
      tap('start-apple');

      expect(store.loginWithGoogleAccount).toHaveBeenCalledTimes(1);
      expect(store.loginWithAppleAccount).toHaveBeenCalledTimes(1);
    });

    it('blocks a second tap while the first sign-in runs', () => {
      store.loginPending.set(true);
      fixture.detectChanges();

      // Angular binds `[disabled]` to the ion-button property, not an attribute.
      expect(
        element().querySelector<HTMLButtonElement>(
          '[data-testid="start-google"]',
        )?.disabled,
      ).toBe(true);
      component['signInWith']('google');
      expect(store.loginWithGoogleAccount).not.toHaveBeenCalled();
    });

    it('reports a rejected sign-in it started', () => {
      tap('start-apple');
      store.loginFailed.set(true);
      fixture.detectChanges();

      expect(
        element().querySelector('[data-testid="start-error"]'),
      ).not.toBeNull();
    });

    /**
     * `loginFailed` is global auth state. A rejection on `/login` before the
     * visitor came back here was not caused by anything on this page.
     */
    it('stays quiet about a failure it did not start', () => {
      store.loginFailed.set(true);
      fixture.detectChanges();

      expect(element().querySelector('[data-testid="start-error"]')).toBeNull();
    });
  });

  it('should call FirebaseAnalytics.setCurrentScreen on ionViewDidEnter', () => {
    const spy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    component.ionViewDidEnter();
    expect(spy).toHaveBeenCalledWith({
      screenName: 'Start',
    });
  });
});
