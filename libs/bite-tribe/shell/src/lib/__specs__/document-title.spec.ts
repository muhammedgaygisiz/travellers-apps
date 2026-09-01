import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import {
  BrandedTitleStrategy,
  documentTitleFor,
  provideDocumentTitle,
  SITE_TITLE,
} from '../document-title';

describe(documentTitleFor.name, () => {
  describe('given the start page', () => {
    it.each(['/', '/start', '/start?redirect=home'])(
      'should use the full site title on %s',
      (url) => {
        expect(documentTitleFor('Welcome', url)).toBe(SITE_TITLE);
      },
    );
  });

  describe('given any other page', () => {
    it('should append the product name to the route title', () => {
      expect(documentTitleFor('Privacy Policy', '/privacy')).toBe(
        'Privacy Policy – BiteTribe',
      );
    });
  });

  describe('given a route without a title', () => {
    it('should fall back to the full site title', () => {
      expect(documentTitleFor(undefined, '/nonsense')).toBe(SITE_TITLE);
    });
  });
});

describe(BrandedTitleStrategy.name, () => {
  describe('given the router reports a titled route', () => {
    it('should brand the document title', () => {
      // `buildTitle` walks the snapshot for the deepest resolved route title.
      // Its own behaviour is Angular's; what this covers is that the strategy
      // brands the result instead of assigning it raw.
      jest
        .spyOn(TitleStrategy.prototype, 'buildTitle')
        .mockReturnValue('Support');

      TestBed.configureTestingModule({ providers: [provideDocumentTitle()] });

      TestBed.inject(TitleStrategy).updateTitle({
        url: '/support',
      } as RouterStateSnapshot);

      expect(TestBed.inject(Title).getTitle()).toBe('Support – BiteTribe');
    });
  });
});
