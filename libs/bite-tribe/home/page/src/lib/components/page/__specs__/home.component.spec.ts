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
import { of, Subject } from 'rxjs';
import { RefresherCustomEvent } from '@ionic/angular';
import SpyInstance = jest.SpyInstance;
import { TranslocoService } from '@jsverse/transloco';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;
  let navController: NavController;
  let componentRef: ComponentRef<BiteTribeHomeComponent>;
  let closedSubject: Subject<any>;

  beforeEach(() => {
    jest.useFakeTimers();

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
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    addIcons({
      menuOutline,
      add,
    });

    fixture = TestBed.createComponent(BiteTribeHomeComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
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

  it('should show the bite skeleton list while bites are loading', async () => {
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isBitesLoading', true);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();
  });

  it('should keep the bite skeleton list visible for at least two seconds', () => {
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isBitesLoading', true);
    fixture.detectChanges();

    componentRef.setInput('isBitesLoading', false);
    fixture.detectChanges();
    jest.advanceTimersByTime(1999);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();

    jest.advanceTimersByTime(1);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeNull();
  });

  it('should show the bite skeleton list while bites are reloading', () => {
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isBitesLoading', false);
    componentRef.setInput('isReloading', true);

    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();
  });

  it('should call scrollToTop on ionContent when scrollToTop is called', () => {
    const scrollToTopMock = jest.fn();
    component.ionContent = signal({
      scrollToTop: scrollToTopMock,
    } as any) as any;

    component.scrollToTop();
    expect(scrollToTopMock).toHaveBeenCalledWith(300);
  });

  describe('onRefresh', () => {
    let completeSpy: SpyInstance;
    beforeEach(() => {
      componentRef.setInput('isReloading', false);
      component.refreshEvent = {
        target: { complete: jest.fn() },
      } as unknown as RefresherCustomEvent;
      completeSpy = jest
        .spyOn(component.refreshEvent.target, 'complete')
        .mockImplementation();
    });

    it('should not complete the refresh event if event is not defined', () => {
      component.refreshEvent = null;

      fixture.detectChanges();
      jest.runAllTimers();

      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should not complete the refresh event if refresh is still ongoing', () => {
      componentRef.setInput('isReloading', true);

      fixture.detectChanges();
      jest.runAllTimers();

      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should complete the refresh event if refresh is done', () => {
      fixture.detectChanges();
      jest.runAllTimers();

      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('filter and search chips', () => {
    it('should show the filter chip by default', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#select-tags')).toBeTruthy();
    });

    it('should hide the filter chip when showFilters is false', () => {
      componentRef.setInput('showFilters', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#select-tags')).toBeNull();
    });

    it('should emit gotoSearch when the search chip is clicked', () => {
      componentRef.setInput('showSearchChip', true);
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.gotoSearch, 'emit');

      fixture.nativeElement.querySelector('[data-cy="search-chip"]').click();

      expect(emitSpy).toHaveBeenCalledTimes(1);
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

  describe('onLoadMore', () => {
    it('should load more bites when there are more to show', () => {
      const bites = new Array(100).fill({});
      componentRef.setInput('bites', bites);
      component.onLoadMore();
      expect(component.currentPage()).toBe(2);
    });

    it('should not advance the page when there are no more bites to show', () => {
      componentRef.setInput('bites', []);
      component.onLoadMore();
      expect(component.currentPage()).toBe(1);
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
      jest.runAllTimers();

      expect(refreshEmitSpy).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    const mockBites = [
      { id: '1', name: 'Burger', place: 'Burger Place' },
      { id: '2', name: 'Pizza', place: 'Pizza Place' },
      { id: '3', name: 'Sushi', place: 'Sushi Bar' },
    ] as any[];

    beforeEach(() => {
      componentRef.setInput('bites', mockBites);
    });

    it('should return all bites when searchTerm is empty', () => {
      component.searchTerm.set('');
      expect(component.filteredBites()).toEqual(mockBites);
    });

    it('should filter bites by exact name match', () => {
      component.searchTerm.set('Pizza');
      const result = component.filteredBites();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Pizza');
    });

    it('should filter bites case-insensitively', () => {
      component.searchTerm.set('burger');
      const result = component.filteredBites();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Burger');
    });

    it('should toggle isSearchVisible on toggleSearch', () => {
      expect(component.isSearchVisible()).toBe(false);
      component.toggleSearch();
      expect(component.isSearchVisible()).toBe(true);
      component.toggleSearch();
      expect(component.isSearchVisible()).toBe(false);
    });

    it('should clear searchTerm when hiding search', () => {
      component.isSearchVisible.set(true);
      component.searchTerm.set('Pizza');
      component.toggleSearch();
      expect(component.searchTerm()).toBe('');
    });

    it('should update searchTerm and reset page on onSearchInput', () => {
      component.currentPage.set(3);
      const event = { target: { value: 'Sushi' } } as any;
      component.onSearchInput(event);
      expect(component.searchTerm()).toBe('Sushi');
      expect(component.currentPage()).toBe(1);
    });

    it('should use filteredBites for displayedBites', () => {
      component.searchTerm.set('Burger');
      expect(component.displayedBites().length).toBe(1);
      expect(component.displayedBites()[0].name).toBe('Burger');
    });
  });
});
