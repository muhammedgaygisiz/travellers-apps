import { inject, Injectable, signal } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite } from 'model';
import { ToastService } from 'toast';
import type { GuestBiteLink } from './guest-bites-page.component';

/**
 * The Guest Bites page's reads and writes (GitHub issue #2216).
 *
 * The Bites are read once when the page opens, and a Bite the owner links or
 * dismisses is taken out of the list once the backend has accepted it. A
 * refused write leaves the Bite where it was, with a toast.
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
    await this.write(link.biteId, () =>
      this.dataAccess.linkBiteToMenuItem(link),
    );
  }

  async dismiss(biteId: string): Promise<void> {
    await this.write(biteId, () =>
      this.dataAccess.linkBiteToMenuItem({ biteId, notOnMenu: true }),
    );
  }

  private async write(
    biteId: string,
    call: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await call();
    } catch {
      await this.failed();

      return;
    }

    this.bites.update((bites) => bites?.filter(({ id }) => id !== biteId));

    await this.toast.present({
      messageKey: 'guest-bites-saved',
      outcome: 'success',
    });
  }

  private failed(): Promise<void> {
    return this.toast.present({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
  }
}
