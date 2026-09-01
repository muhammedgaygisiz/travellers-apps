import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PATH } from 'utils';

/**
 * The one host search engines should credit, decided 1 September 2026 in issue
 * \#1454. `www.bitetribe.app` and `bite-tribe.web.app` serve the same build, so
 * without a canonical the ranking signal splits three ways.
 */
export const CANONICAL_ORIGIN = 'https://bitetribe.app';

/**
 * The routes that render without a session, and are therefore the only ones
 * worth indexing on their own. They are the same four the sitemap lists.
 *
 * `start` is not among them: `/` redirects to it, so it is the start page
 * reached by a second URL rather than a page of its own.
 */
const SELF_CANONICAL_PATHS: readonly string[] = [
  PATH.SUPPORT,
  PATH.PRIVACY_POLICY,
  PATH.ACCOUNT_DELETION,
];

/**
 * The canonical URL for a router URL.
 *
 * Anything that is not a public page - the authenticated surfaces, `/start`,
 * an unknown path - canonicalizes to the site root, because that is the only
 * thing a crawler without a session can actually read there.
 */
export const canonicalUrlFor = (routerUrl: string): string => {
  const path = routerUrl.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');

  return SELF_CANONICAL_PATHS.includes(path)
    ? `${CANONICAL_ORIGIN}/${path}`
    : `${CANONICAL_ORIGIN}/`;
};

/**
 * Keeps `<link rel="canonical">` in step with the active route (issue \#1454).
 *
 * `index.html` ships the tag pointing at the site root, which is right for the
 * page a crawler lands on and stays right until routing starts - initial
 * navigation is disabled until the App Check gate opens. This only narrows it
 * afterwards, so `/support` and `/privacy` claim themselves instead of claiming
 * to be duplicates of the root while the sitemap lists them as pages.
 *
 * Only Googlebot and friends read the rewritten value; unfurlers never run the
 * app. The static tags in `index.html` are what they see.
 */
export const provideCanonicalUrl = (): EnvironmentProviders =>
  provideAppInitializer(() => {
    const destroyRef = inject(DestroyRef);
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    // The tag is authored in `index.html`. If a build ever drops it there is
    // nothing to keep in step, and inventing one here would hide that.
    if (!link) {
      return;
    }

    inject(Router)
      .events.pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ urlAfterRedirects }) => {
        link.href = canonicalUrlFor(urlAfterRedirects);
      });
  });
