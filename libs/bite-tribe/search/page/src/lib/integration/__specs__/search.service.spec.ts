import { TestBed } from '@angular/core/testing';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import { signal } from '@angular/core';
import { SearchService } from '../search.service';

describe(SearchService.name, () => {
  const users = { value: signal([]) };
  const searchText = signal('');

  beforeEach(() => {
    searchText.set('');

    TestBed.configureTestingModule({
      providers: [
        SearchService,
        {
          provide: SearchDataAccessService,
          useValue: { users, searchText },
        },
      ],
    });
  });

  it('should expose the users resource from data access', () => {
    const service = TestBed.inject(SearchService);

    expect(service.users).toBe(users);
  });

  it('should pass search text to data access', () => {
    const service = TestBed.inject(SearchService);

    service.searchUsers('Daniel');

    expect(searchText()).toBe('Daniel');
  });
});
