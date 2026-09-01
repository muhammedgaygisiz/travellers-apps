import { inject, Injectable, Provider } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { PATH } from 'utils';

/**
 * The full document title, carrying the approved App Store subtitle. It is the
 * same line `index.html` and the Open Graph tags ship; change it in all three.
 */
export const SITE_TITLE = 'BiteTribe – Find it. Try it. Share it.';

const BRAND = 'BiteTribe';

/**
 * The document title for a route title and the URL it was resolved on.
 *
 * The start page is what `/` redirects to, so it is the page a search result
 * for the site root actually shows. It gets the full proposition rather than
 * its route title, which is the bare word `Welcome`.
 */
export const documentTitleFor = (
  routeTitle: string | undefined,
  url: string,
): string => {
  const path = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');

  if (path === '' || path === PATH.START) {
    return SITE_TITLE;
  }

  return routeTitle ? `${routeTitle} – ${BRAND}` : SITE_TITLE;
};

/**
 * Keeps the brand in the document title on every route (issue \#1454).
 *
 * Angular's default strategy assigns the route's `title` to the document and
 * nothing else, so `index.html` shipping a good `<title>` was not enough: the
 * moment routing started, the page a crawler had rendered was called `Welcome`.
 * Every route title in `routes.ts` is a short in-app label of that kind, and
 * none of them name the product.
 */
@Injectable()
export class BrandedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(
      documentTitleFor(this.buildTitle(snapshot), snapshot.url),
    );
  }
}

export const provideDocumentTitle = (): Provider => ({
  provide: TitleStrategy,
  useClass: BrandedTitleStrategy,
});
