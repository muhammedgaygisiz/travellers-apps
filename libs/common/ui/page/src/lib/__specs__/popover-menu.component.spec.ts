import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PopoverMenuComponent } from '../popover-menu.component';
import {
  ComponentRef,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { SupportedLang } from 'localization';
import { addNecessaryIcons } from '@travellers-apps/utils-common';

addNecessaryIcons();

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve({}),
  })
) as jest.Mock;

describe('PopoverMenuComponent', () => {
  let component: PopoverMenuComponent;
  let componentRef: ComponentRef<PopoverMenuComponent>;
  let fixture: ComponentFixture<PopoverMenuComponent>;
  let languageChangeClickEmitSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PopoverMenuComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    languageChangeClickEmitSpy = jest.spyOn(
      component.languageChangeClick,
      'emit'
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit languageChangeClick with SupportedLang.EN when English item is clicked', () => {
    const englishItem = fixture.debugElement.query(
      By.css('ion-item:nth-child(2)')
    );

    englishItem.triggerEventHandler('click', null);

    expect(languageChangeClickEmitSpy).toHaveBeenCalledWith(SupportedLang.EN);
  });

  it('should emit loginClick when auth button is clicked', () => {
    componentRef.setInput('hideAuthButton', false);
    componentRef.setInput('isAuthenticated', false);

    fixture.detectChanges();

    expect(fixture.debugElement).toMatchSnapshot();

    jest.spyOn(component.loginClick, 'emit');
    const loginButton = fixture.debugElement.query(
      By.css('[data-cy="btn-auth"]')
    );

    loginButton.triggerEventHandler('click', null);
    expect(component.loginClick.emit).toHaveBeenCalled();
  });

  it('should emit logoutClick when logout button is clicked', () => {
    componentRef.setInput('isAuthenticated', true);

    fixture.detectChanges();

    jest.spyOn(component.logoutClick, 'emit');
    const logoutButton = fixture.debugElement.query(
      By.css('[data-cy="btn-logout"]')
    );
    logoutButton.triggerEventHandler('click', null);
    expect(component.logoutClick.emit).toHaveBeenCalled();
  });

  it('should not show auth/logout button when hideAuthButton is true', () => {
    componentRef.setInput('hideAuthButton', true);

    const loginButton = fixture.debugElement.query(
      By.css('[data-cy="btn-auth"]')
    );
    const logoutButton = fixture.debugElement.query(
      By.css('[data-cy="btn-logout"]')
    );
    expect(loginButton).toBeNull();
    expect(logoutButton).toBeNull();
  });
});
