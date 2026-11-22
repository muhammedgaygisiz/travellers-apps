import { inject, Injectable, signal } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite } from 'model';
import { ToastService } from 'toast';
import type { GuestBiteLink } from './guest-bites-page.component';
import {
  guestBiteLinkFailure,
  linkedDishName,
  type GuestBiteLinkFailure,
} from './guest-bites';

/**
 * What each refusal says, and whether the Bite leaves the list
 * (GitHub issue #2262). A Bite that can never be linked from here leaves it,
 * so the owner is not left retrying a write that cannot succeed.
 */
const LINK_FAILURES: Readonly<
  Record<GuestBiteLinkFailure, { messageKey: string; dropBite: boolean }>
> = {
  'already-linked': {
    messageKey: 'guest-bites-already-linked',
    dropBite: true,
  },
  'dish-gone': { messageKey: 'guest-bites-dish-gone', dropBite: false },
  'not-assigned': { messageKey: 'guest-bites-not-assigned', dropBite: false },
  'bite-gone': { messageKey: 'guest-bites-bite-gone', dropBite: true },
  unknown: {
    messageKey: 'something-went-wrong-please-try-again',
    dropBite: false,
  },
};

/**
 * The Guest Bites page's reads and writes (GitHub issue #2216).
 *
 * The Bites are read once when the page opens, and a Bite the owner links or
 * dismisses is taken out of the list once the backend has accepted it. A
 * refused write says why (#2262): a Bite that can never be linked from here
 * leaves the list, and one that can stays where it was.
 */
@Injectable({ providedIn: 'root' })
export class GuestBitesService {
  private readonly dataAccess = inject(MenuDataAccessService);
  private readonly toast = inject(ToastService);

  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;

  /** `undefined` until the first read lands. */
  readonly bites = signal<Bite[] | undefined>(undefined);

  async load(): Promise<void> {
    this.bites.set(undefined);

    try {
      this.bites.set(await this.dataAccess.loadBitesForRestaurant());
    } catch {
      this.bites.set([]);
      await this.failed();
    }
  }

  async link(link: GuestBiteLink): Promise<void> {
    // Named before the write, from the menu the owner chose from: the toast
    // confirms what they picked (#2263).
    const dish = linkedDishName(this.menu(), link.menuItemId, link.variantId);

    await this.write(
      link.biteId,
      () => this.dataAccess.linkBiteToMenuItem(link),
      dish
        ? { messageKey: 'guest-bites-linked', params: { dish } }
        : { messageKey: 'guest-bites-linked-unnamed' },
    );
  }

  async dismiss(biteId: string): Promise<void> {
    await this.write(
      biteId,
      () => this.dataAccess.linkBiteToMenuItem({ biteId, notOnMenu: true }),
      { messageKey: 'guest-bites-marked-not-on-menu' },
    );
  }

  private async write(
    biteId: string,
    call: () => Promise<unknown>,
    success: { messageKey: string; params?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await call();
    } catch (error) {
      const failure = LINK_FAILURES[guestBiteLinkFailure(error)];

      if (failure.dropBite) {
        this.drop(biteId);
      }

      await this.toast.present({
        messageKey: failure.messageKey,
        outcome: 'failure',
      });

      return;
    }

    this.drop(biteId);

    await this.toast.present({ ...success, outcome: 'success' });
  }

  private drop(biteId: string): void {
    this.bites.update((bites) => bites?.filter(({ id }) => id !== biteId));
  }

  private failed(): Promise<void> {
    return this.toast.present({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
  }
}
