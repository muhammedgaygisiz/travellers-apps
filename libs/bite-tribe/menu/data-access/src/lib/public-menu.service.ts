import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BiteTribeApiService } from 'bite-tribe/api';
import { isPublicMenuResolved } from 'model';
import { PUBLIC_MENU_RESTAURANT_PARAM } from 'utils';
import type {
  Menu,
  PublicMenuRefusalReason,
  PublicMenuRestaurant,
} from 'model';

/**
 * A restaurant's menu, read by somebody with no BiteTribe account
 * (GitHub issue #1102).
 *
 * ## Why this is not the menu service next door
 *
 * `MenuDataAccessService` reads the menu of the restaurant behind a Bite, out
 * of the NgRx store the authenticated app fills on its way here. A guest
 * arriving from a QR code or a published link has no store, no Bite and no
 * session - they have a restaurant id in a URL and nothing else. The two share
 * the renderer and nothing above it.
 *
 * ## Four states, not two
 *
 * A menu that cannot be read is not an error. A restaurant that never wrote one
 * is an ordinary fact and the reader is owed a sentence about it, which is why
 * a refusal is a state of its own rather than a thrown error - and why the
 * transport failing is a *third* thing, worded differently, because that one is
 * about the phone rather than about the restaurant.
 */
export type PublicMenuView =
  | { kind: 'loading' }
  | { kind: 'menu'; restaurant: PublicMenuRestaurant; menu: Menu }
  | { kind: 'refused'; reason: PublicMenuRefusalReason }
  /** The call never got an answer. Not a refusal, and worded differently. */
  | { kind: 'failed' };

@Injectable()
export class PublicMenuService {
  private readonly api = inject(BiteTribeApiService);
  private readonly route = inject(ActivatedRoute);

  private readonly view = signal<PublicMenuView>({ kind: 'loading' });

  readonly state = this.view.asReadonly();

  /**
   * The restaurant the public menu route names.
   *
   * Read off the snapshot rather than subscribed to: reaching a different
   * restaurant means following a different link, which is a fresh navigation.
   *
   * The parameter name comes from the constant the route declares it with, and
   * is deliberately not `restaurantId` - see
   * {@link PUBLIC_MENU_RESTAURANT_PARAM}.
   */
  private readonly restaurantId =
    this.route.snapshot.paramMap.get(PUBLIC_MENU_RESTAURANT_PARAM) ?? '';

  /** The menu on screen, where there is one. */
  readonly menu = computed<Menu | undefined>(() => {
    const state = this.view();

    return state.kind === 'menu' ? state.menu : undefined;
  });

  async load(): Promise<void> {
    if (!this.restaurantId) {
      this.view.set({ kind: 'refused', reason: 'restaurantNotFound' });

      return;
    }

    const result = await this.api.loadPublicMenu(this.restaurantId);

    if (!result) {
      this.view.set({ kind: 'failed' });

      return;
    }

    this.view.set(
      isPublicMenuResolved(result)
        ? { kind: 'menu', restaurant: result.restaurant, menu: result.menu }
        : { kind: 'refused', reason: result.reason },
    );
  }

  /** Asking again, after a refusal or a dropped connection. */
  retry(): Promise<void> {
    this.view.set({ kind: 'loading' });

    return this.load();
  }
}
