import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartComponent } from '../start.component';
import { provideRouter } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
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
      const element: HTMLElement = fixture.nativeElement;
      const signUp = element.querySelector('[data-testid="start-sign-up"]');

      expect(
        element.querySelector('[data-testid="start-landing"]'),
      ).not.toBeNull();
      expect(signUp?.getAttribute('routerLink')).toBe('/registration');
      expect(signUp?.getAttribute('fill')).toBeNull();
      expect(
        element
          .querySelector('[data-testid="start-log-in"]')
          ?.getAttribute('href'),
      ).toBe('/login');
    });

    it('says what BiteTribe is before asking for anything', () => {
      const element: HTMLElement = fixture.nativeElement;

      expect(element.querySelector('.headline')).not.toBeNull();
      expect(element.querySelectorAll('.benefits li')).toHaveLength(3);
    });
  });

  describe('in the native apps', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('native', true);
      fixture.detectChanges();
    });

    it('keeps the logo and the two buttons', () => {
      const element: HTMLElement = fixture.nativeElement;
      const buttons = [...element.querySelectorAll('ion-button')];

      expect(element.querySelector('[data-testid="start-landing"]')).toBeNull();
      expect(element.querySelector('.tagline')).not.toBeNull();
      expect(
        buttons.map((button) => button.getAttribute('routerLink')),
      ).toEqual(['/login', '/registration']);
      expect(buttons[1].getAttribute('fill')).toBe('outline');
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
