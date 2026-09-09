import { TestBed } from '@angular/core/testing';
import { SearchBite } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { BiteSearchDataAccessService } from 'bite-tribe-admin/bites-data-access';
import { BiteSearchService } from '../bite-search.service';

const bite = (over: Partial<SearchBite> = {}): SearchBite => ({
  id: 'b1',
  name: 'Ramen',
  place: 'Noodle Bar',
  ...over,
});

describe(BiteSearchService.name, () => {
  let service: BiteSearchService;
  let search: jest.Mock;
  let deleteBite: jest.Mock;
  let logout: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    search = jest.fn().mockResolvedValue([]);
    deleteBite = jest.fn().mockResolvedValue({ biteId: 'b1' });
    logout = jest.fn();
    present = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BiteSearchDataAccessService,
          useValue: { search, deleteBite },
        },
        { provide: BiteTribeStoreService, useValue: { logout } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(BiteSearchService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('starts with nothing found and no search behind it', () => {
    expect(service.results()).toEqual([]);
    expect(service.searched()).toBe(false);
    expect(service.failed()).toBe(false);
  });

  it('holds what the search found', async () => {
    search.mockResolvedValue([bite(), bite({ id: 'b2' })]);

    await service.search('ramen');

    expect(search).toHaveBeenCalledWith('ramen');
    expect(service.results().map((result) => result.id)).toEqual(['b1', 'b2']);
    expect(service.searched()).toBe(true);
  });

  it('resolves the selection out of the results it holds', async () => {
    search.mockResolvedValue([bite(), bite({ id: 'b2', name: 'Gyoza' })]);
    await service.search('a');

    service.select(bite({ id: 'b2' }));

    expect(service.selected()?.name).toBe('Gyoza');
  });

  // A detail column still showing a Bite from the previous search would invite
  // an operator to act on something the current results do not contain.
  it('drops the selection when a new search runs', async () => {
    search.mockResolvedValue([bite()]);
    await service.search('ramen');
    service.select(bite());

    await service.search('gyoza');

    expect(service.selected()).toBeUndefined();
  });

  describe('a failed search', () => {
    beforeEach(() => search.mockRejectedValue(new Error('unavailable')));

    // Telling an operator acting on a report that a Bite does not exist, when
    // the truth is that the search broke, is the failure worth avoiding here.
    it('reports the failure rather than an empty result', async () => {
      await service.search('ramen');

      expect(service.failed()).toBe(true);
      expect(service.results()).toEqual([]);
      expect(service.searching()).toBe(false);
    });

    it('clears the failure when the next search works', async () => {
      await service.search('ramen');
      search.mockResolvedValue([bite()]);

      await service.search('ramen');

      expect(service.failed()).toBe(false);
      expect(service.results()).toHaveLength(1);
    });
  });

  describe('deleting a Bite', () => {
    beforeEach(async () => {
      search.mockResolvedValue([bite(), bite({ id: 'b2', name: 'Gyoza' })]);
      await service.search('a');
      service.select(bite());
    });

    it('sends the id and the reason to the callable', async () => {
      await service.deleteBite('b1', 'Not food');

      expect(deleteBite).toHaveBeenCalledWith('b1', 'Not food');
    });

    // Re-running the search would send a second collection scan through the
    // callable to confirm what this call already knows.
    it('drops the Bite from the results without searching again', async () => {
      await service.deleteBite('b1', 'Not food');

      expect(service.results().map((result) => result.id)).toEqual(['b2']);
      expect(search).toHaveBeenCalledTimes(1);
    });

    // The selection is resolved out of the results, so the detail column
    // empties on its own: there is nothing left to show.
    it('leaves the detail column empty', async () => {
      await service.deleteBite('b1', 'Not food');

      expect(service.selected()).toBeUndefined();
    });

    it('says it deleted the Bite', async () => {
      await service.deleteBite('b1', 'Not food');

      expect(present).toHaveBeenCalledWith({
        messageKey: 'admin-bites-deleted',
        outcome: 'success',
      });
    });

    it('reports it is working while the call is in flight', async () => {
      let release = (): void => undefined;
      deleteBite.mockReturnValue(
        new Promise<void>((resolve) => {
          release = (): void => resolve();
        }),
      );

      const pending = service.deleteBite('b1', 'Not food');
      expect(service.deleting()).toBe(true);

      release();
      await pending;

      expect(service.deleting()).toBe(false);
    });

    // An operator told a Bite was removed when it was not will not look again.
    describe('a failed delete', () => {
      beforeEach(() => deleteBite.mockRejectedValue(new Error('unavailable')));

      it('says so rather than reporting a success', async () => {
        await service.deleteBite('b1', 'Not food');

        expect(present).toHaveBeenCalledWith({
          messageKey: 'admin-bites-delete-failed',
          outcome: 'failure',
        });
      });

      it('keeps the Bite in the results', async () => {
        await service.deleteBite('b1', 'Not food');

        expect(service.results().map((result) => result.id)).toEqual([
          'b1',
          'b2',
        ]);
        expect(service.selected()?.id).toBe('b1');
        expect(service.deleting()).toBe(false);
      });
    });
  });

  it('logs out through the store', () => {
    service.logout();

    expect(logout).toHaveBeenCalled();
  });
});
