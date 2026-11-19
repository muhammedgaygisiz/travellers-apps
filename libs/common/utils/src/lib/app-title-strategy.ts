import { inject, Injectable, InjectionToken, Provider } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * The app's name in the document title, as its `index.html` writes it -
 * "BiteTribe Admin", "BiteTribe Business". Not `APP_TITLE`, which is the
 * header wordmark and may spell the brand differently.
 */
export const APP_DOCUMENT_TITLE = new InjectionToken<string>(
  'app-document-title',
);

/** A route's title with the app's name, or the app's name alone. */
export const appDocumentTitle = (
  routeTitle: string | undefined,
  appName: string,
): string => (routeTitle ? `${routeTitle} – ${appName}` : appName);

/**
 * Never leaves a previous route's title in place (GitHub issue #1977).
 *
 * Angular's default strategy only sets the document title for a route that
 * declares one, so after signing in to the admin or business app the tab kept
 * saying "Login" - the shared auth route's title - on every page until a full
 * reload. This sets one on every navigation: the route's own title with the
 * app's name, or the app's name alone. The consumer app's
 * `BrandedTitleStrategy` does the same with its start-page special case.
 */
@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly appName = inject(APP_DOCUMENT_TITLE);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(
      appDocumentTitle(this.buildTitle(snapshot), this.appName),
    );
  }
}

export const provideAppTitleStrategy = (appName: string): Provider[] => [
  { provide: APP_DOCUMENT_TITLE, useValue: appName },
  { provide: TitleStrategy, useClass: AppTitleStrategy },
];
