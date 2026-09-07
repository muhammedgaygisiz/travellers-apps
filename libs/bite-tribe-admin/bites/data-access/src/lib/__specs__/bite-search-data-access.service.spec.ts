const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import { SearchBite } from 'model';
import { BiteSearchDataAccessService } from '../bite-search-data-access.service';

const bite = (over: Partial<SearchBite> = {}): SearchBite => ({
  id: 'b1',
  name: 'Ramen',
  place: 'Noodle Bar',
  ...over,
});

describe(BiteSearchDataAccessService.name, () => {
  let service: BiteSearchDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    callByNameMock.mockResolvedValue({ data: [] });
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiteSearchDataAccessService);
  });

  // The callable is the reusable part of the consumer app's search; its UI is
  // not, because `scope:bite-tribe-admin` may not import `scope:bite-tribe`
  // features (issue #1476).
  it('calls the same searchBites the consumer app drives', async () => {
    await service.search('ramen');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'searchBites',
      data: { searchText: 'ramen' },
    });
  });

  it('returns the Bites the callable found', async () => {
    callByNameMock.mockResolvedValue({ data: [bite(), bite({ id: 'b2' })] });

    const results = await service.search('ramen');

    expect(results.map((result) => result.id)).toEqual(['b1', 'b2']);
  });

  it('trims the term before sending it', async () => {
    await service.search('  ramen  ');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'searchBites',
      data: { searchText: 'ramen' },
    });
  });

  // The callable would return nothing for these anyway; not calling lets the
  // page say "too short" instead of "no results".
  it.each([[''], ['  '], ['ra'], [' ra ']])(
    'does not call for the term %p',
    async (term) => {
      await expect(service.search(term)).resolves.toEqual([]);
      expect(callByNameMock).not.toHaveBeenCalled();
    },
  );

  it('survives a response with no data', async () => {
    callByNameMock.mockResolvedValue({ data: undefined });

    await expect(service.search('ramen')).resolves.toEqual([]);
  });

  // The consumer app's search resource swallows every failure and shows an
  // empty list. An operator acting on a report has to be able to tell "the
  // search broke" from "the Bite does not exist".
  it('lets a failure reach the caller rather than reading it as no results', async () => {
    callByNameMock.mockRejectedValue(new Error('unavailable'));

    await expect(service.search('ramen')).rejects.toThrow('unavailable');
  });
});
