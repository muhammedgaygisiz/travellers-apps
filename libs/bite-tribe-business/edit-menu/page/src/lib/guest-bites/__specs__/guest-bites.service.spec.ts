import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite } from 'model';
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

  beforeEach(() => {
    dataAccess = {
      restaurant: signal(undefined),
      menu: signal(undefined),
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
      messageKey: 'guest-bites-saved',
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
  });

  it('keeps a Bite the backend refused, and says so', async () => {
    dataAccess.linkBiteToMenuItem.mockRejectedValue(new Error('denied'));
    await service.load();

    await service.link({ biteId: 'b1', menuItemId: 'm1' });

    expect(service.bites()).toEqual(BITES);
    expect(toast.present).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    );
  });
});
