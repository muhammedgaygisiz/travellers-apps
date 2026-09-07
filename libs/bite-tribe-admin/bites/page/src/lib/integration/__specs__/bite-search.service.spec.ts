import { TestBed } from '@angular/core/testing';
import { SearchBite } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
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
  let logout: jest.Mock;

  beforeEach(() => {
    search = jest.fn().mockResolvedValue([]);
    logout = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteSearchDataAccessService, useValue: { search } },
        { provide: BiteTribeStoreService, useValue: { logout } },
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

  it('logs out through the store', () => {
    service.logout();

    expect(logout).toHaveBeenCalled();
  });
});
