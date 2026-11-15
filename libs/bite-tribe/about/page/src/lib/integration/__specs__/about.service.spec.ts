import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { AboutDataAccessService } from 'bite-tribe/about-data-access';
import { AboutService } from '../about.service';

/** The slice of a resource the service reads, with its loading flag settable. */
const fakeCount = (): {
  isLoading: WritableSignal<boolean>;
  reload: jest.Mock<boolean, []>;
} => {
  const isLoading = signal(false);
  return { isLoading, reload: jest.fn(() => true) };
};

describe(AboutService.name, () => {
  let bites: ReturnType<typeof fakeCount>;
  let users: ReturnType<typeof fakeCount>;
  let service: AboutService;

  beforeEach(() => {
    bites = fakeCount();
    users = fakeCount();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AboutDataAccessService,
          useValue: {
            totalNumberBites: bites,
            totalNumberUsers: users,
            totalNumberBitesValue: signal(undefined),
            totalNumberUsersValue: signal(undefined),
            biteCountriesValue: signal(undefined),
          },
        },
        { provide: NavController, useValue: {} },
      ],
    });

    service = TestBed.inject(AboutService);
  });

  // GitHub issue #2072.
  describe('loading', () => {
    it('is off once both counts are read', () => {
      expect(service.loading()).toBe(false);
    });

    it.each([
      ['the Bites', 'bites'],
      ['the users', 'users'],
    ] as const)('is on while %s are being counted', (_name, which) => {
      (which === 'bites' ? bites : users).isLoading.set(true);

      expect(service.loading()).toBe(true);
    });
  });

  describe('reloadCounts', () => {
    it('re-reads both counts', () => {
      service.reloadCounts();

      expect(bites.reload).toHaveBeenCalledTimes(1);
      expect(users.reload).toHaveBeenCalledTimes(1);
    });

    // A reload on a reloading resource starts a second request.
    it('leaves a count alone that is already being read', () => {
      users.isLoading.set(true);

      service.reloadCounts();

      expect(bites.reload).toHaveBeenCalledTimes(1);
      expect(users.reload).not.toHaveBeenCalled();
    });
  });
});
