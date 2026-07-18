import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { HomeFeedControlsComponent } from '../home-feed-controls.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('HomeFeedControlsComponent', () => {
  let component: HomeFeedControlsComponent;
  let fixture: ComponentFixture<HomeFeedControlsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(HomeFeedControlsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the filter chip by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#select-tags')).toBeTruthy();
  });

  it('should hide the filter chip when showFilters is false', () => {
    fixture.componentRef.setInput('showFilters', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#select-tags')).toBeNull();
  });

  it('should show the number of active filters', () => {
    fixture.componentRef.setInput('selectedFilters', ['filter1', 'filter2']);
    fixture.componentRef.setInput('distance', 5);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-badge').textContent).toBe(
      '3',
    );
  });

  it('should count price filters as active filters', () => {
    fixture.componentRef.setInput('maxPriceFilter', 20);
    fixture.detectChanges();

    expect(component.numberOfFilters()).toBe(1);
    expect(component.hasActiveFilters()).toBe(true);
  });

  describe('sortingLabelKey', () => {
    it('should return "distance" when sorting is "distance"', () => {
      fixture.componentRef.setInput('sorting', 'distance');
      expect(component.sortingLabelKey()).toBe('distance');
    });

    it('should return "likes" when sorting is "likes"', () => {
      fixture.componentRef.setInput('sorting', 'likes');
      expect(component.sortingLabelKey()).toBe('likes');
    });

    it('should return "date" when sorting is "createdAt"', () => {
      fixture.componentRef.setInput('sorting', 'createdAt');
      expect(component.sortingLabelKey()).toBe('date');
    });

    it('should return "distance" when sorting is unknown', () => {
      fixture.componentRef.setInput('sorting', 'randomValue');
      expect(component.sortingLabelKey()).toBe('distance');
    });

    it('should return "price" when sorting is "price"', () => {
      fixture.componentRef.setInput('sorting', 'price');
      expect(component.sortingLabelKey()).toBe('price');
    });

    it('should return "rating" when sorting is "rating"', () => {
      fixture.componentRef.setInput('sorting', 'rating');
      expect(component.sortingLabelKey()).toBe('rating');
    });
  });

  it('should emit gotoSearch when the search chip is clicked', () => {
    fixture.componentRef.setInput('showSearchChip', true);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.gotoSearch, 'emit');

    fixture.nativeElement.querySelector('[data-testid="search-chip"]').click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit openMapView when the map chip is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.openMapView, 'emit');

    fixture.nativeElement
      .querySelector('ion-chip:not(#select-tags):not(#select-sorting)')
      .click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit sortingChange with the new value', () => {
    const emitSpy = jest.spyOn(component.sortingChange, 'emit');

    component.emitSortingChange({ detail: { value: 'likes' } });

    expect(emitSpy).toHaveBeenCalledWith('likes');
  });

  it('should not emit sortingChange if event.detail is undefined', () => {
    const emitSpy = jest.spyOn(component.sortingChange, 'emit');

    component.emitSortingChange({});

    expect(emitSpy).not.toHaveBeenCalled();
  });

  describe('onFilterChange', () => {
    let modal: { dismiss: jest.Mock };

    beforeEach(() => {
      modal = {
        dismiss: jest.fn(),
      };
    });

    it('should dismiss the modal and emit filter changes', () => {
      const filterSelection = {
        tagFilters: ['filter1'],
        distanceFilter: '10',
        priceFilter: 20,
      };

      const filtersChangedSpy = jest.spyOn(component.filtersChanged, 'emit');

      component.onFilterChange(filterSelection, modal);
      expect(modal.dismiss).toHaveBeenCalled();
      expect(filtersChangedSpy).toHaveBeenCalledWith(filterSelection);
    });
  });

  describe('onFiltersClear', () => {
    it('should dismiss the modal and emit filterCleared', () => {
      const modal = {
        dismiss: jest.fn(),
      };
      const filterClearedSpy = jest.spyOn(component.filterCleared, 'emit');

      component.onFiltersClear(modal);
      expect(modal.dismiss).toHaveBeenCalled();
      expect(filterClearedSpy).toHaveBeenCalled();
    });
  });
});
