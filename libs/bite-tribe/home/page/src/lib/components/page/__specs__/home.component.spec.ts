import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  IonModal,
  NavController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteTribeHomeComponent } from '../home.component';
import { ComponentRef, signal } from '@angular/core';
import { addIcons } from 'ionicons';
import { add, menuOutline } from 'ionicons/icons';
import { Dialog } from '@angular/cdk/dialog';
import { Subject } from 'rxjs';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import SpyInstance = jest.SpyInstance;

jest.mock('localization');

addNecessaryIcons();

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;
  let navController: NavController;
  let componentRef: ComponentRef<BiteTribeHomeComponent>;
  let closedSubject: Subject<any>;

  beforeEach(() => {
    navController = {
      navigateForward: jest.fn(),
    } as Partial<NavController> as NavController;

    closedSubject = new Subject<any>();
    const dialogMock = {
      open: jest.fn().mockReturnValue({
        closed: closedSubject.asObservable(),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: NavController, useValue: navController },
        { provide: Dialog, useValue: dialogMock },
      ],
    });

    addIcons({
      menuOutline,
      add,
    });

    fixture = TestBed.createComponent(BiteTribeHomeComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty bites', () => {
    expect(component.bites()).toBeUndefined();
  });

  it('should update bites when input changes', () => {
    const mockBites = [
      { id: 1, name: 'Burger' },
      { id: 2, name: 'Pizza' },
    ];

    componentRef.setInput('bites', mockBites);
    fixture.detectChanges();

    expect(component.bites()).toEqual(mockBites);
  });

  it('should call scrollToTop on ionContent when scrollToTop is called', () => {
    const scrollToTopMock = jest.fn();
    component.ionContent = signal({
      scrollToTop: scrollToTopMock,
    } as any) as any;

    component.scrollToTop();
    expect(scrollToTopMock).toHaveBeenCalledWith(300);
  });

  describe('onBiteRefresh', () => {
    let completeSpy: SpyInstance;
    beforeEach(() => {
      componentRef.setInput('isReloadingBites', false);
      component.refreshEvent = { target: { complete: jest.fn() } } as any;
      completeSpy = jest
        .spyOn(component.refreshEvent.target, 'complete')
        .mockImplementation();
    });

    it('should not complete the refresh event if event is not defined', () => {
      component.refreshEvent = undefined;

      fixture.detectChanges();
      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should not complete the refresh event if refresh is still ongoing', () => {
      componentRef.setInput('isReloadingBites', true);

      fixture.detectChanges();
      expect(completeSpy).not.toHaveBeenCalled();
    });
  });

  describe('selectedSortingLabel', () => {
    it('should return "Distance" when selectedSorting is "distance"', () => {
      componentRef.setInput('sorting', 'distance');
      expect(component.sortingLabel()).toBe('Distance');
    });

    it('should return "Likes" when selectedSorting is "likes"', () => {
      componentRef.setInput('sorting', 'likes');
      expect(component.sortingLabel()).toBe('Likes');
    });

    it('should return "Creation date" when selectedSorting is "date"', () => {
      componentRef.setInput('sorting', 'createdAt');
      expect(component.sortingLabel()).toBe('Creation date');
    });

    it('should return "Distance" when selectedSorting is unknown', () => {
      componentRef.setInput('sorting', 'randomValue');
      expect(component.sortingLabel()).toBe('Distance');
    });

    it('should return "Price" when selectedSorting is "price"', () => {
      componentRef.setInput('sorting', 'price');
      expect(component.sortingLabel()).toBe('Price');
    });
  });

  describe('emitSortingChange', () => {
    let sortingChangeSpy: SpyInstance;

    beforeEach(() => {
      sortingChangeSpy = jest.spyOn(component.sortingChange, 'emit');
    });

    it('should emit sortingChange with the new value', () => {
      const event = { detail: { value: 'likes' } };
      component.emitSortingChange(event);
      expect(sortingChangeSpy).toHaveBeenCalledWith('likes');
    });

    it('should not emit sortingChange if event.detail is undefined', () => {
      const event = { detail: undefined };
      component.emitSortingChange(event as any);
      expect(sortingChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('numberOfFilters', () => {
    it('should return the correct number of filters', () => {
      componentRef.setInput('selectedFilters', ['filter1', 'filter2']);
      componentRef.setInput('distance', '5');
      expect(component.numberOfFilters()).toBe(3); // 2 filters + 1 distance filter

      componentRef.setInput('distance', '');
      expect(component.numberOfFilters()).toBe(2); // Only the two selected filters
    });

    it('should return 0 when no filters are applied', () => {
      componentRef.setInput('selectedFilters', []);
      componentRef.setInput('distance', '');
      expect(component.numberOfFilters()).toBe(0);
    });
  });

  describe('onFilterChange', () => {
    let modal: any;

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
    it('should emit filterCleared output', () => {
      const modal = {
        dismiss: jest.fn(),
      } as unknown as IonModal;
      const filterClearedSpy = jest.spyOn(component.filterCleared, 'emit');

      component.onFiltersClear(modal);
      expect(modal.dismiss).toHaveBeenCalled();
      expect(filterClearedSpy).toHaveBeenCalled();
    });
  });

  describe('onIonInfinite', () => {
    it('should load more bites and complete the event', () => {
      const infiniteScrollEvent = {
        target: {
          complete: jest.fn(),
        },
      } as unknown as InfiniteScrollCustomEvent;

      const bites = new Array(100).fill({});
      componentRef.setInput('bites', bites);
      component.onIonInfinite(infiniteScrollEvent);
      expect(component.currentPage()).toBe(2);
      expect(infiniteScrollEvent.target.complete).toHaveBeenCalled();
    });
  });

  describe('refreshBites', () => {
    const refresherEvent = {
      target: {
        complete: jest.fn(),
      },
    } as unknown as RefresherCustomEvent;
    let refreshEmitSpy: SpyInstance;

    beforeEach(() => {
      refreshEmitSpy = jest
        .spyOn(component.refresh, 'emit')
        .mockImplementation();
    });

    it('should emit refresh event and complete the refresher', () => {
      component.refreshBites(refresherEvent);
      expect(refreshEmitSpy).toHaveBeenCalled();
    });
  });
});
