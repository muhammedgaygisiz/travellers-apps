import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { signal } from '@angular/core';
import type { SearchCategory, SearchResult } from 'model';
import { SearchContainer } from '../search.container';
import { SearchService } from '../search.service';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const results = signal<SearchResult[]>([]);
const isLoading = signal(false);
const hasSearched = signal(false);
const selectedCategory = signal<SearchCategory>('user');
const MockSearchService = {
  results: {
    value: results,
    isLoading,
  },
  selectedCategory,
  hasSearched,
  search: jest.fn(),
  selectCategory: jest.fn(),
  resultClicked: jest.fn(),
};

describe(SearchContainer.name, () => {
  let component: SearchContainer;
  let fixture: ComponentFixture<SearchContainer>;

  beforeEach(() => {
    results.set([]);
    isLoading.set(false);
    hasSearched.set(false);
    selectedCategory.set('user');

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: SearchService, useValue: MockSearchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a searchbar with debounce', () => {
    const searchbar = fixture.nativeElement.querySelector(
      'ion-searchbar',
    ) as HTMLIonSearchbarElement;

    expect(searchbar).toBeTruthy();
    expect(searchbar.debounce).toBe(1000);
  });

  it('should pass the search text to the search service', () => {
    const searchbar = fixture.nativeElement.querySelector(
      'ion-searchbar',
    ) as HTMLIonSearchbarElement;

    searchbar.dispatchEvent(
      new CustomEvent('ionInput', {
        detail: { value: 'Daniel' },
      }),
    );

    expect(MockSearchService.search).toHaveBeenCalledWith('Daniel');
  });

  it('should pass the selected category to the search service', () => {
    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    chips[1].click();

    expect(MockSearchService.selectCategory).toHaveBeenCalledWith('bite');
  });

  it('should not show the empty state before a search', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="search-empty"]'),
    ).toBeNull();
  });

  it('should show a loading state while searching', () => {
    isLoading.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="search-loading"]'),
    ).toBeTruthy();
  });

  it('should show an empty state when a search has no results', () => {
    hasSearched.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="search-empty"]'),
    ).toBeTruthy();
  });

  it('should show sorted results and pass a clicked result to the service', () => {
    const daniel: SearchResult = {
      category: 'user',
      value: {
        userId: 'user-1',
        displayName: 'Daniel Langone',
        fullName: 'Daniel Joseph Langone',
        email: 'daniel@example.com',
        photoUrl: '',
      },
    };
    results.set([
      {
        category: 'user',
        value: {
          userId: 'user-2',
          displayName: 'Zoe',
          email: 'zoe@example.com',
          photoUrl: '',
        },
      },
      daniel,
    ]);
    hasSearched.set(true);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ion-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Daniel Langone');
    expect(items[0].textContent).toContain('Daniel Joseph Langone');
    expect(items[0].textContent).not.toContain('daniel@example.com');

    items[0].click();

    expect(MockSearchService.resultClicked).toHaveBeenCalledWith(daniel);
  });

  it('should set current screen to Search', () => {
    jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');

    component.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Search',
    });
  });
});
