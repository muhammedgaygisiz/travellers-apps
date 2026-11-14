import { TestBed } from '@angular/core/testing';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import type { SearchCategory, SearchResult } from 'model';
import { SearchService } from '../search.service';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

describe(SearchService.name, () => {
  const results = { value: signal([]) };
  const searchText = signal('');
  const searchCategory = signal<SearchCategory>('user');
  const searchCountryCode = signal('');
  const navController = {
    navigateForward: jest.fn(),
  };
  const analytics = {
    logEvent: jest.fn(),
  };

  beforeEach(() => {
    searchText.set('');
    searchCategory.set('user');
    searchCountryCode.set('');
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        SearchService,
        { provide: AnalyticsService, useValue: analytics },
        { provide: NavController, useValue: navController },
        {
          provide: SearchDataAccessService,
          useValue: { results, searchText, searchCategory, searchCountryCode },
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

  it('should log search_performed once a query becomes meaningful', () => {
    const service = TestBed.inject(SearchService);

    service.search('Daniel');

    expect(analytics.logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.SearchPerformed,
    );
  });

  it('should not log search_performed for a too-short query', () => {
    const service = TestBed.inject(SearchService);

    service.search('D');

    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it('should pass selected category to data access', () => {
    const service = TestBed.inject(SearchService);

    service.selectCategory('bite');

    expect(searchCategory()).toBe('bite');
  });

  it('should report a search after two non-blank characters', () => {
    const service = TestBed.inject(SearchService);

    searchText.set('  Da  ');

    expect(service.hasSearched()).toBe(true);
  });

  it('should pass the picked country to data access', () => {
    const service = TestBed.inject(SearchService);

    service.selectCountry('CH');

    expect(searchCountryCode()).toBe('CH');
  });

  it('should log search_performed once a country is picked', () => {
    const service = TestBed.inject(SearchService);
    searchCategory.set('country');

    service.selectCountry('CH');

    expect(analytics.logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.SearchPerformed,
    );
  });

  it('should log search_performed only once per country search session', () => {
    const service = TestBed.inject(SearchService);
    searchCategory.set('country');

    service.selectCountry('CH');
    service.selectCountry('DE');

    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });

  it('should report a country search as soon as a country is picked', () => {
    const service = TestBed.inject(SearchService);
    searchCategory.set('country');

    expect(service.hasSearched()).toBe(false);

    searchCountryCode.set('CH');

    expect(service.hasSearched()).toBe(true);
  });

  it('should not treat a picked country as a search in a text category', () => {
    const service = TestBed.inject(SearchService);
    searchCountryCode.set('CH');

    expect(service.hasSearched()).toBe(false);
  });

  it('should navigate to the selected country bite', () => {
    const service = TestBed.inject(SearchService);

    service.resultClicked({
      category: 'country',
      value: {
        id: 'bite-3',
        name: 'Fondue',
        place: 'Bern',
      },
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'bite',
      'bite-3',
    ]);
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
});
