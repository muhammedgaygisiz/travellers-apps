import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import {
  appDocumentTitle,
  provideAppTitleStrategy,
} from '../app-title-strategy';

@Component({ template: '' })
class BlankPage {}

/** See GitHub issue #1977. */
describe('AppTitleStrategy', () => {
  it('joins a route title to the app name, or uses the app name alone', () => {
    expect(appDocumentTitle('City pages', 'BiteTribe Admin')).toBe(
      'City pages – BiteTribe Admin',
    );
    expect(appDocumentTitle(undefined, 'BiteTribe Admin')).toBe(
      'BiteTribe Admin',
    );
  });

  it('does not leave the login title in place after navigating to a route without one', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', title: 'Login', component: BlankPage },
          { path: 'untitled', component: BlankPage },
          { path: 'landing-pages', title: 'City pages', component: BlankPage },
        ]),
        provideAppTitleStrategy('BiteTribe Admin'),
      ],
    });
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigateByUrl('/login');
    expect(title.getTitle()).toBe('Login – BiteTribe Admin');

    await router.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('BiteTribe Admin');

    await router.navigateByUrl('/landing-pages');
    expect(title.getTitle()).toBe('City pages – BiteTribe Admin');
  });
});
