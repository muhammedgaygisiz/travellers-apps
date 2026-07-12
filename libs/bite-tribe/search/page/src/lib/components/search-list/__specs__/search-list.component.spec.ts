import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { SearchResult } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { SearchListComponent } from '../search-list.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(SearchListComponent.name, () => {
  let component: SearchListComponent;
  let fixture: ComponentFixture<SearchListComponent>;
  let componentRef: ComponentRef<SearchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchListComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should show a loading state', () => {
    componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="search-loading"]'),
    ).toBeTruthy();
  });

  it('should show an empty state after an empty search', () => {
    componentRef.setInput('hasSearched', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="search-empty"]'),
    ).toBeTruthy();
  });

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
    ];
    componentRef.setInput('results', results);

    expect(component.sortedResults().map(component.getResultTitle)).toEqual([
      'Alice',
      'Charlie',
    ]);
    expect(component.results()).toBe(results);
    expect(results.map(component.getResultTitle)).toEqual(['Charlie', 'Alice']);
  });

  it('should render sorted results and emit clicked result', () => {
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
    componentRef.setInput('results', [
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
    const emitSpy = jest.spyOn(component.resultClick, 'emit');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ion-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Daniel Langone');
    expect(items[0].textContent).toContain('Daniel Joseph Langone');
    expect(items[0].textContent).not.toContain('daniel@example.com');

    items[0].click();

    expect(emitSpy).toHaveBeenCalledWith(daniel);
  });

  it('should add the result id on image error without mutating the previous set', () => {
    const previousIds = component.imageErroredResultIds();

    component.onResultImageError('user-1');

    expect(component.imageErroredResultIds()).not.toBe(previousIds);
    expect(previousIds.size).toBe(0);
    expect(component.imageErroredResultIds().has('user-1')).toBe(true);
  });

  it('should describe bite results and prefer imagePath', () => {
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
    expect(component.getResultFallbackIcon(result)).toBe('restaurant-outline');
    expect(component.getResultImage(result)).toBe('bite-image-path');
  });

  it('should describe city results like bites with a location icon', () => {
    const result: SearchResult = {
      category: 'city',
      value: {
        id: 'bite-2',
        name: 'Margherita',
        place: 'Napoli',
        imagePath: 'bite-image-path',
        description: 'Classic pizza',
      },
    };

    expect(component.getResultId(result)).toBe('city-bite-2');
    expect(component.getResultTitle(result)).toBe('Margherita');
    expect(component.getResultSubtitle(result)).toBe('Napoli - Classic pizza');
    expect(component.getResultFallbackIcon(result)).toBe('location-outline');
    expect(component.isUnverifiedRestaurant(result)).toBe(false);
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
    expect(component.getResultFallbackIcon(result)).toBe('storefront-outline');
    expect(component.isUnverifiedRestaurant(result)).toBe(true);
  });
});
