import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { SearchbarInputEventDetail } from '@ionic/core';
import type { SearchResult } from 'bite-tribe/search-data-access';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { SearchPage } from '../search.page';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(SearchPage.name, () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;
  let componentRef: ComponentRef<SearchPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create with default input values', () => {
    expect(component).toBeTruthy();
    expect(component.results()).toEqual([]);
    expect(component.selectedCategory()).toBe('user');
    expect(component.isLoading()).toBe(false);
    expect(component.hasSearched()).toBe(false);
  });

  describe('sortedResults', () => {
    it('should sort results by title without mutating the input', () => {
      const results: SearchResult[] = [
        {
          category: 'user',
          value: {
            userId: 'charlie',
            displayName: 'Charlie',
            email: 'charlie@example.com',
            photoUrl: '',
          },
        },
        {
          category: 'user',
          value: {
            userId: 'alice',
            displayName: 'Alice',
            email: 'alice@example.com',
            photoUrl: '',
          },
        },
        {
          category: 'user',
          value: {
            userId: 'bob',
            displayName: 'Bob',
            email: 'bob@example.com',
            photoUrl: '',
          },
        },
      ];
      componentRef.setInput('results', results);

      expect(component.sortedResults().map(component.getResultTitle)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
      expect(component.results()).toBe(results);
      expect(results.map(component.getResultTitle)).toEqual([
        'Charlie',
        'Alice',
        'Bob',
      ]);
    });

    it('should treat a missing display name as an empty string', () => {
      componentRef.setInput('results', [
        {
          category: 'user',
          value: {
            userId: 'named',
            displayName: 'Alice',
            email: 'alice@example.com',
            photoUrl: '',
          },
        },
        {
          category: 'user',
          value: {
            userId: 'unnamed',
            email: 'unnamed@example.com',
            photoUrl: '',
          },
        } as SearchResult,
      ]);

      expect(component.sortedResults().map(component.getResultId)).toEqual([
        'user-unnamed',
        'user-named',
      ]);
    });
  });

  describe('category selection', () => {
    it('should emit the selected category', () => {
      const emitSpy = jest.spyOn(component.categoryChange, 'emit');

      component.categoryChange.emit('restaurant');

      expect(emitSpy).toHaveBeenCalledWith('restaurant');
    });
  });

  describe('searchbarInput', () => {
    it('should emit the entered search text', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: 'Alice' },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('Alice');
    });

    it('should emit an empty string when the input has no value', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: null },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('onResultImageError', () => {
    it('should add the result id without mutating the previous set', () => {
      const previousIds = component.imageErroredResultIds();

      component.onResultImageError('user-1');

      expect(component.imageErroredResultIds()).not.toBe(previousIds);
      expect(previousIds.size).toBe(0);
      expect(component.imageErroredResultIds().has('user-1')).toBe(true);
    });

    it('should retain result ids from previous image errors', () => {
      component.onResultImageError('user-1');
      component.onResultImageError('user-2');

      expect([...component.imageErroredResultIds()]).toEqual([
        'user-1',
        'user-2',
      ]);
    });
  });

  describe('result display helpers', () => {
    it('should describe bite results', () => {
      const result: SearchResult = {
        category: 'bite',
        value: {
          id: 'bite-1',
          name: 'Butter Chicken',
          place: 'Tandoori House',
          image: 'legacy-image',
          imagePath: 'bite-image-path',
          description: 'Creamy chicken curry',
        },
      };

      expect(component.getResultId(result)).toBe('bite-bite-1');
      expect(component.getResultTitle(result)).toBe('Butter Chicken');
      expect(component.getResultSubtitle(result)).toBe(
        'Tandoori House - Creamy chicken curry',
      );
      expect(component.getResultFallbackIcon(result)).toBe(
        'restaurant-outline',
      );
      expect(component.getResultImage(result)).toBe('bite-image-path');
    });

    it('should fall back to the legacy image when imagePath is missing', () => {
      const result: SearchResult = {
        category: 'bite',
        value: {
          id: 'bite-1',
          name: 'Butter Chicken',
          place: 'Tandoori House',
          image: 'legacy-image',
        },
      };

      expect(component.getResultImage(result)).toBe('legacy-image');
    });

    it('should identify unverified restaurant results', () => {
      const result: SearchResult = {
        category: 'restaurant',
        value: {
          id: 'place-1',
          name: 'Yalkottu',
          biteId: 'bite-1',
          place: 'Yalkottu',
        },
      };

      expect(component.getResultId(result)).toBe('restaurant-place-1');
      expect(component.getResultTitle(result)).toBe('Yalkottu');
      expect(component.getResultSubtitle(result)).toBe('Yalkottu');
      expect(component.getResultFallbackIcon(result)).toBe(
        'storefront-outline',
      );
      expect(component.isUnverifiedRestaurant(result)).toBe(true);
    });
  });
});
