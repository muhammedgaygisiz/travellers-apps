import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppMenuComponent } from '../app-menu.component';
import {
  ComponentRef,
  DebugElement,
  Pipe,
  PipeTransform,
  provideZonelessChangeDetection,
} from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve({}),
  }),
) as jest.Mock;

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('AppMenuComponent', () => {
  let component: AppMenuComponent;
  let componentRef: ComponentRef<AppMenuComponent>;
  let fixture: ComponentFixture<AppMenuComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: TranslocoPipe, useValue: MockTranslocoPipe },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppMenuComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit loginClick when auth button is clicked', () => {
    componentRef.setInput('hideAuthButton', false);
    componentRef.setInput('isAuthenticated', false);

    fixture.detectChanges();

    // Snapshot the rendered markup instead of the element tree: since Ionic
    // 8.7.18 the bundled Stencil runtime patches `childNodes`, so both the
    // debug-element and DOM-element serializers report an empty tree under
    // jsdom. `innerHTML` is unaffected and still covers the rendered output.
    expect(fixture.nativeElement.innerHTML).toMatchSnapshot();

    jest.spyOn(component.loginClick, 'emit');
    const loginButton = fixture.debugElement.query(
      By.css('[data-testid="btn-login"]'),
    );

    loginButton.triggerEventHandler('click', null);
    expect(component.loginClick.emit).toHaveBeenCalled();
  });

  it('should emit logoutClick when logout button is clicked', () => {
    componentRef.setInput('isAuthenticated', true);

    fixture.detectChanges();

    jest.spyOn(component.logoutClick, 'emit');
    const logoutButton = fixture.debugElement.query(
      By.css('[data-testid="btn-logout"]'),
    );
    logoutButton.triggerEventHandler('click', null);
    expect(component.logoutClick.emit).toHaveBeenCalled();
  });

  describe('signed-in account', () => {
    const showProfileEntry = (): void => {
      componentRef.setInput('isAuthenticated', true);
      componentRef.setInput('showMyProfile', true);
    };

    const query = (testId: string): DebugElement =>
      fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

    it('should show the account photo and display name on the profile entry', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: 'https://example.test/avatar.png',
      });

      fixture.detectChanges();

      expect(
        query('menu-account-photo').nativeElement.getAttribute('src'),
      ).toBe('https://example.test/avatar.png');
      expect(query('menu-account-display-name').nativeElement.textContent).toBe(
        'Muhammed',
      );
    });

    it('should label the account photo with the display name', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: 'https://example.test/avatar.png',
      });

      fixture.detectChanges();

      expect(
        query('menu-account-photo').nativeElement.getAttribute('alt'),
      ).toBe('Muhammed');
    });

    it('should keep the anonymous icon when no account is bound', () => {
      showProfileEntry();

      fixture.detectChanges();

      expect(query('menu-account-photo')).toBeNull();
      expect(query('menu-account-display-name')).toBeNull();
      expect(query('menu-my-profile').nativeElement.innerHTML).toContain(
        'person-circle-outline',
      );
    });

    it('should keep the display name when the account has no photo', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: '',
      });

      fixture.detectChanges();

      expect(query('menu-account-photo')).toBeNull();
      expect(query('menu-account-display-name').nativeElement.textContent).toBe(
        'Muhammed',
      );
    });

    it('should fall back to the anonymous icon when the photo fails to load', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: 'https://example.test/gone.png',
      });

      fixture.detectChanges();

      query('menu-account-photo').triggerEventHandler('error', null);
      fixture.detectChanges();

      expect(query('menu-account-photo')).toBeNull();
      expect(query('menu-account-display-name').nativeElement.textContent).toBe(
        'Muhammed',
      );
    });

    it('should show the next account photo after a failed one', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: 'https://example.test/gone.png',
      });

      fixture.detectChanges();

      query('menu-account-photo').triggerEventHandler('error', null);
      fixture.detectChanges();

      componentRef.setInput('account', {
        displayName: 'Someone Else',
        photoUrl: 'https://example.test/other.png',
      });

      fixture.detectChanges();

      expect(
        query('menu-account-photo').nativeElement.getAttribute('src'),
      ).toBe('https://example.test/other.png');
      expect(query('menu-account-display-name').nativeElement.textContent).toBe(
        'Someone Else',
      );
    });

    it('should drop the account when the session ends', () => {
      showProfileEntry();
      componentRef.setInput('account', {
        displayName: 'Muhammed',
        photoUrl: 'https://example.test/avatar.png',
      });

      fixture.detectChanges();

      componentRef.setInput('isAuthenticated', false);
      componentRef.setInput('account', undefined);

      fixture.detectChanges();

      expect(query('menu-my-profile')).toBeNull();
      expect(query('menu-account-display-name')).toBeNull();
    });
  });

  it('should not show auth/logout button when hideAuthButton is true', () => {
    componentRef.setInput('hideAuthButton', true);

    const loginButton = fixture.debugElement.query(
      By.css('[data-testid="btn-auth"]'),
    );
    const logoutButton = fixture.debugElement.query(
      By.css('[data-testid="btn-logout"]'),
    );
    expect(loginButton).toBeNull();
    expect(logoutButton).toBeNull();
  });
});
