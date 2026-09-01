import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { canonicalUrlFor, provideCanonicalUrl } from '../canonical-url';

describe(canonicalUrlFor.name, () => {
  describe('given a public route', () => {
    it.each(['/support', '/privacy', '/account-deletion'])(
      'should let %s canonicalize to itself',
      (url) => {
        expect(canonicalUrlFor(url)).toBe(`https://bitetribe.app${url}`);
      },
    );

    it('should ignore query parameters and fragments', () => {
      expect(canonicalUrlFor('/support?lang=de#contact')).toBe(
        'https://bitetribe.app/support',
      );
    });

    it('should ignore a trailing slash', () => {
      expect(canonicalUrlFor('/privacy/')).toBe(
        'https://bitetribe.app/privacy',
      );
    });
  });

  describe('given a route that is not public', () => {
    it.each(['/', '/start', '/home', '/bite/abc123', '/nonsense'])(
      'should canonicalize %s to the site root',
      (url) => {
        expect(canonicalUrlFor(url)).toBe('https://bitetribe.app/');
      },
    );
  });
});

describe(provideCanonicalUrl.name, () => {
  let events$: Subject<NavigationEnd>;
  let link: HTMLLinkElement | undefined;

  const initialize = async (): Promise<void> => {
    events$ = new Subject();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: events$ } },
        provideCanonicalUrl(),
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
  };

  const navigateTo = (urlAfterRedirects: string): void =>
    events$.next(new NavigationEnd(1, urlAfterRedirects, urlAfterRedirects));

  beforeEach(() => {
    link = document.createElement('link');
    link.rel = 'canonical';
    link.href = 'https://bitetribe.app/';
    document.head.appendChild(link);
  });

  afterEach(() => {
    link?.remove();
    link = undefined;
  });

  describe('given the app navigates to a public page', () => {
    it('should point the canonical link at that page', async () => {
      await initialize();

      navigateTo('/support');

      expect(link?.href).toBe('https://bitetribe.app/support');
    });
  });

  describe('given the app navigates to an authenticated page', () => {
    it('should point the canonical link back at the site root', async () => {
      await initialize();

      navigateTo('/support');
      navigateTo('/home');

      expect(link?.href).toBe('https://bitetribe.app/');
    });
  });

  describe('given the document has no canonical link', () => {
    it('should not add one', async () => {
      link?.remove();
      link = undefined;

      await initialize();

      navigateTo('/support');

      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    });
  });
});
