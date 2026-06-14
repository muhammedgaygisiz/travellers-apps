import { TestBed } from '@angular/core/testing';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { SearchService } from '../search.service';

describe(SearchService.name, () => {
  const users = { value: signal([]) };
  const searchText = signal('');
  const navController = {
    navigateForward: jest.fn(),
  };

  beforeEach(() => {
    searchText.set('');
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        SearchService,
        { provide: NavController, useValue: navController },
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

  it('should report a search after three non-blank characters', () => {
    const service = TestBed.inject(SearchService);

    searchText.set('  Dan  ');

    expect(service.hasSearched()).toBe(true);
  });

  it('should navigate to the selected user profile', () => {
    const service = TestBed.inject(SearchService);
    const user = {
      userId: 'user-1',
      displayName: 'Daniel',
      email: 'daniel@example.com',
      photoUrl: '',
    };

    service.userClicked(user);

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'profile',
      'user-1',
    ]);
  });
});
