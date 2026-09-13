import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BiteTribeApiService } from 'bite-tribe/api';
import { PUBLIC_MENU_RESTAURANT_PARAM } from 'utils';
import { PublicMenuService } from '../public-menu.service';

/**
 * Reading a menu with no account (GitHub issue #1102).
 *
 * The distinction these hold open is that a menu which cannot be read is not an
 * error. A restaurant that never wrote one is an ordinary fact and the reader is
 * owed a sentence about it - and the transport failing is a third thing again,
 * because that one is about their phone rather than about the restaurant.
 */
const RESTAURANT = { id: 'restaurant-1', name: 'Sakura Kitchen' };
const MENU = { id: 'menu-1', categories: [], currency: 'EUR' };

describe(PublicMenuService.name, () => {
  let loadPublicMenu: jest.Mock;

  const build = (
    restaurantId: string | null = 'restaurant-1',
  ): PublicMenuService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PublicMenuService,
        { provide: BiteTribeApiService, useValue: { loadPublicMenu } },
        {
          provide: ActivatedRoute,
          useValue: {
            // Key-aware on purpose. A mock that answers any key would let the
            // route and the service drift apart over the parameter's name, and
            // that name is load-bearing: `restaurantId` is what the NgRx router
            // selector keys on, so calling it that puts a refused Firestore
            // read on every load of a route meant for readers with no account.
            snapshot: {
              paramMap: {
                get: (name: string): string | null =>
                  name === PUBLIC_MENU_RESTAURANT_PARAM ? restaurantId : null,
              },
            },
          },
        },
      ],
    });

    return TestBed.inject(PublicMenuService);
  };

  beforeEach(() => {
    loadPublicMenu = jest
      .fn()
      .mockResolvedValue({ ok: true, restaurant: RESTAURANT, menu: MENU });
  });

  it('shows the restaurant and its menu', async () => {
    const service = build();

    await service.load();

    expect(loadPublicMenu).toHaveBeenCalledWith('restaurant-1');
    expect(service.state()).toEqual({
      kind: 'menu',
      restaurant: RESTAURANT,
      menu: MENU,
    });
  });

  it('exposes the menu for the renderer', async () => {
    const service = build();

    await service.load();

    expect(service.menu()).toEqual(MENU);
  });

  /**
   * The case the endpoint exists for. A restaurant that takes no orders is not
   * a reason to withhold a menu, so nothing here asks about ordering at all.
   */
  it('says why when there is no menu to show', async () => {
    loadPublicMenu.mockResolvedValue({ ok: false, reason: 'menuMissing' });
    const service = build();

    await service.load();

    expect(service.state()).toEqual({ kind: 'refused', reason: 'menuMissing' });
    expect(service.menu()).toBeUndefined();
  });

  /**
   * Kept apart from a refusal, because the sentence is different: a refusal
   * tells the reader something true about the restaurant, and this tells them
   * the phone never got through.
   */
  it('keeps a transport failure apart from a refusal', async () => {
    loadPublicMenu.mockResolvedValue(undefined);
    const service = build();

    await service.load();

    expect(service.state()).toEqual({ kind: 'failed' });
  });

  it('refuses a route with no restaurant without calling the backend', async () => {
    const service = build(null);

    await service.load();

    expect(loadPublicMenu).not.toHaveBeenCalled();
    expect(service.state()).toMatchObject({ reason: 'restaurantNotFound' });
  });

  it('goes back to loading before asking again', async () => {
    loadPublicMenu.mockResolvedValue(undefined);
    const service = build();
    await service.load();

    loadPublicMenu.mockResolvedValue({
      ok: true,
      restaurant: RESTAURANT,
      menu: MENU,
    });
    await service.retry();

    expect(service.state()).toMatchObject({ kind: 'menu' });
    expect(loadPublicMenu).toHaveBeenCalledTimes(2);
  });
});
