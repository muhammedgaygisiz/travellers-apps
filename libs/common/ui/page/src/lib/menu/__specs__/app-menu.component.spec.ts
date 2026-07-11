import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppMenuComponent } from '../app-menu.component';
import {
  ComponentRef,
  Pipe,
  PipeTransform,
  provideZonelessChangeDetection,
} from '@angular/core';
import { addNecessaryIcons, SupportedLang } from 'utils';
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

    expect(fixture.debugElement).toMatchSnapshot();

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
