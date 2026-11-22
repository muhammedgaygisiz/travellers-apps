import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite, Menu } from 'model';
import { ToastService } from 'toast';
import { GuestBitesService } from '../guest-bites.service';

jest.mock('bite-tribe/menu-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

/** The Guest Bites page's reads and writes (GitHub issue #2216). */
describe(GuestBitesService.name, () => {
  let service: GuestBitesService;
  let dataAccess: {
    restaurant: ReturnType<typeof signal>;
    menu: ReturnType<typeof signal>;
    loadBitesForRestaurant: jest.Mock;
    linkBiteToMenuItem: jest.Mock;
  };
  let toast: { present: jest.Mock };

  const BITES = [{ id: 'b1' }, { id: 'b2' }] as Bite[];

  const MENU = {
    categories: [
      {
        id: 'c1',
        title: 'Hauptgerichte',
        items: [
          { id: 'm1', name: 'Rösti', description: '', price: 18 },
          {
            id: 'm2',
            name: 'Ente Spezial',
            description: '',
            variants: [{ id: 'v1', name: 'groß', description: '', price: 24 }],
          },
        ],
      },
    ],
  } as unknown as Menu;

  /** A callable refusal as the web SDK delivers it. */
  const refusal = (code: string, message = ''): Error =>
    Object.assign(new Error(message), { code: `functions/${code}` });

  beforeEach(() => {
    dataAccess = {
      restaurant: signal(undefined),
      menu: signal(MENU),
      loadBitesForRestaurant: jest.fn().mockResolvedValue(BITES),
      linkBiteToMenuItem: jest.fn().mockResolvedValue({}),
    };
    toast = { present: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        GuestBitesService,
        { provide: MenuDataAccessService, useValue: dataAccess },
        { provide: ToastService, useValue: toast },
      ],
    });

    service = TestBed.inject(GuestBitesService);
  });

  it("loads the restaurant's Bites", async () => {
    await service.load();

    expect(service.bites()).toEqual(BITES);
  });

  it('shows an empty list and says so when the read fails', async () => {
    dataAccess.loadBitesForRestaurant.mockRejectedValue(new Error('offline'));

    await service.load();

    expect(service.bites()).toEqual([]);
    expect(toast.present).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    );
  });

  it('links a Bite and takes it out of the list', async () => {
    await service.load();
    await service.link({ biteId: 'b1', menuItemId: 'm1' });

    expect(dataAccess.linkBiteToMenuItem).toHaveBeenCalledWith({
      biteId: 'b1',
      menuItemId: 'm1',
    });
    expect(service.bites()?.map(({ id }) => id)).toEqual(['b2']);
    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'guest-bites-linked',
      params: { dish: 'Rösti' },
      outcome: 'success',
    });
  });

  it('names the variant a Bite was linked to (#2263)', async () => {
    await service.load();
    await service.link({ biteId: 'b1', menuItemId: 'm2', variantId: 'v1' });

    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'guest-bites-linked',
      params: { dish: 'Ente Spezial (groß)' },
      outcome: 'success',
    });
  });

  it('marks a Bite as not on the menu and takes it out of the list', async () => {
    await service.load();
    await service.dismiss('b2');

    expect(dataAccess.linkBiteToMenuItem).toHaveBeenCalledWith({
      biteId: 'b2',
      notOnMenu: true,
    });
    expect(service.bites()?.map(({ id }) => id)).toEqual(['b1']);
    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'guest-bites-marked-not-on-menu',
      outcome: 'success',
    });
  });

  /** Why a link was refused, and whether retrying can help (#2262). */
  describe('a refused link', () => {
    it.each`
      case                               | error                                                                               | messageKey                                 | remaining
      ${'the guest linked it meanwhile'} | ${refusal('failed-precondition', 'The guest linked this Bite to a dish themself.')} | ${'guest-bites-already-linked'}            | ${['b2']}
      ${'the dish left the menu'}        | ${refusal('invalid-argument', "That dish is not on this restaurant's menu.")}       | ${'guest-bites-dish-gone'}                 | ${['b1', 'b2']}
      ${'the restaurant is not theirs'}  | ${refusal('permission-denied')}                                                     | ${'guest-bites-not-assigned'}              | ${['b1', 'b2']}
      ${'the Bite was deleted'}          | ${refusal('not-found', 'Bite was not found.')}                                      | ${'guest-bites-bite-gone'}                 | ${['b2']}
      ${'the network failed'}            | ${new Error('offline')}                                                             | ${'something-went-wrong-please-try-again'} | ${['b1', 'b2']}
    `(
      'says so when $case',
      async ({
        error,
        messageKey,
        remaining,
      }: {
        error: Error;
        messageKey: string;
        remaining: string[];
      }) => {
        dataAccess.linkBiteToMenuItem.mockRejectedValue(error);
        await service.load();

        await service.link({ biteId: 'b1', menuItemId: 'm1' });

        expect(service.bites()?.map(({ id }) => id)).toEqual(remaining);
        expect(toast.present).toHaveBeenCalledWith({
          messageKey,
          outcome: 'failure',
        });
      },
    );

    it('reads the code where a native rejection folds it into the message', async () => {
      dataAccess.linkBiteToMenuItem.mockRejectedValue(
        new Error(
          'failed-precondition: The guest linked this Bite to a dish themself.',
        ),
      );
      await service.load();

      await service.dismiss('b1');

      expect(service.bites()?.map(({ id }) => id)).toEqual(['b2']);
      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'guest-bites-already-linked',
        outcome: 'failure',
      });
    });
  });
});
