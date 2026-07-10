import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { SearchbarInputEventDetail } from '@ionic/core';
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
  });

  it('should create with default input values', () => {
    expect(component).toBeTruthy();
    expect(component.results()).toEqual([]);
    expect(component.selectedCategory()).toBe('user');
    expect(component.isLoading()).toBe(false);
    expect(component.hasSearched()).toBe(false);
  });

  describe('category selection', () => {
    it('should emit the selected category', () => {
      const emitSpy = jest.spyOn(component.categoryChange, 'emit');

      component.categoryValueChange('restaurant');

      expect(emitSpy).toHaveBeenCalledWith('restaurant');
    });

    it('should expose translated category options for the chip radio group', () => {
      expect(component.categoryOptions()).toEqual([
        { label: 'search-category-user', value: 'user' },
        { label: 'search-category-bite', value: 'bite' },
        { label: 'search-category-restaurant', value: 'restaurant' },
        { label: 'search-category-city', value: 'city' },
      ]);
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
});
