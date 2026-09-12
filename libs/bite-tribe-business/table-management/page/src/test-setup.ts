import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

/**
 * jsdom implements no scrolling, and a scrollable `ion-segment` calls
 * `scrollTo` on its own container as soon as it renders.
 *
 * The room switcher is scrollable on purpose - it is what keeps a restaurant of
 * six rooms from widening a phone - so without this every test that renders the
 * page fails on a method the environment simply does not have, rather than on
 * anything about the page.
 */
Element.prototype.scrollTo = jest.fn();
