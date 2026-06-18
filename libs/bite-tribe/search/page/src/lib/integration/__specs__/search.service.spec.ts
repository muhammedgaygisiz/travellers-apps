import { TestBed } from '@angular/core/testing';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import type { SearchCategory, SearchResult } from 'model';
import { SearchService } from '../search.service';

describe(SearchService.name, () => {
  const results = { value: signal([]) };
  const searchText = signal('');
  const searchCategory = signal<SearchCategory>('user');
  const navController = {
    navigateForward: jest.fn(),
  };

  beforeEach(() => {
    searchText.set('');
    searchCategory.set('user');
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        SearchService,
        { provide: NavController, useValue: navController },
        {
          provide: SearchDataAccessService,
          useValue: { results, searchText, searchCategory },
        },
      ],
    });
  });

  it('should expose the results resource from data access', () => {
    const service = TestBed.inject(SearchService);

    expect(service.results).toBe(results);
  });

  it('should pass search text to data access', () => {
    const service = TestBed.inject(SearchService);

    service.search('Daniel');

    expect(searchText()).toBe('Daniel');
  });

  it('should pass selected category to data access', () => {
    const service = TestBed.inject(SearchService);

    service.selectCategory('bite');

    expect(searchCategory()).toBe('bite');
  });

  it('should report a search after three non-blank characters', () => {
    const service = TestBed.inject(SearchService);

    searchText.set('  Dan  ');

    expect(service.hasSearched()).toBe(true);
  });

  it('should navigate to the selected user profile', () => {
    const service = TestBed.inject(SearchService);
    const result: SearchResult = {
      category: 'user',
      value: {
        userId: 'user-1',
        displayName: 'Daniel',
        email: 'daniel@example.com',
        photoUrl: '',
      },
    };

    service.resultClicked(result);

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'profile',
      'user-1',
    ]);
  });

  it('should navigate to the selected bite', () => {
    const service = TestBed.inject(SearchService);

    service.resultClicked({
      category: 'bite',
      value: {
        id: 'bite-1',
        name: 'Butter Chicken',
        place: 'Tandoori House',
      },
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'bite',
      'bite-1',
    ]);
  });

  it('should navigate to a verified restaurant', () => {
    const service = TestBed.inject(SearchService);

    service.resultClicked({
      category: 'restaurant',
      value: {
        id: 'restaurant-1',
        name: 'Italian Restaurant Bern',
        biteId: 'bite-1',
        restaurantId: 'restaurant-1',
      },
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'bite',
      'bite-1',
      'restaurant',
      'restaurant-1',
    ]);
  });

  it('should navigate to an unverified restaurant place', () => {
    const service = TestBed.inject(SearchService);

    service.resultClicked({
      category: 'restaurant',
      value: {
        id: 'place-1',
        name: 'Yalkottu',
        biteId: 'bite-1',
        place: 'Yalkottu & Sons',
      },
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'bite',
      'bite-1',
      'restaurant',
      'place',
      'Yalkottu%20%26%20Sons',
    ]);
  });
});
