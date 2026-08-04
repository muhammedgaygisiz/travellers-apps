import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController, provideIonicAngular } from '@ionic/angular/standalone';
import { By } from '@angular/platform-browser';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteTribeHomeComponent } from '../home.component';
import { HomeFeedControlsComponent } from '../home-feed-controls/home-feed-controls.component';
import { ComponentRef } from '@angular/core';
import { addIcons } from 'ionicons';
import { add, menuOutline } from 'ionicons/icons';
import { Dialog } from '@angular/cdk/dialog';
import { of, Subject } from 'rxjs';
import { RefresherCustomEvent } from '@ionic/angular';
import SpyInstance = jest.SpyInstance;
import { TranslocoService } from '@jsverse/transloco';
import type { Bite } from 'model';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Bite',
  image: '',
  place: 'Bite Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;
  let navController: NavController;
  let componentRef: ComponentRef<BiteTribeHomeComponent>;
  let closedSubject: Subject<unknown>;

  beforeEach(() => {
    jest.useFakeTimers();

    navController = {
      navigateForward: jest.fn(),
    } as Partial<NavController> as NavController;

    closedSubject = new Subject<unknown>();
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
      createBite({ id: '1', name: 'Burger' }),
      createBite({ id: '2', name: 'Pizza' }),
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

  it('should run the header progress bar while the bite skeleton shows', () => {
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isBitesLoading', true);

    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();
  });

  it('should stop the header progress bar with the bite skeleton', () => {
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isBitesLoading', true);
    fixture.detectChanges();

    componentRef.setInput('isBitesLoading', false);
    fixture.detectChanges();
    jest.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeNull();
  });

  it('should keep an already loaded feed readable while it resynchronizes', () => {
    // The skeleton replaces the feed, so a resynchronization that runs on
    // content the user already has must not hide it. Reconnecting after an
    // offline save put Home under a skeleton with everything behind it
    // (issue #1230).
    componentRef.setInput('bites', [createBite({ id: '1', name: 'Burger' })]);
    componentRef.setInput('showSpinner', true);
    componentRef.setInput('isReloading', true);

    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('bt-bite')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();
  });

  describe('feed synchronization error', () => {
    const feedErrorCard = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('bt-feed-error-card');

    it('should not report a feed error while the feed is healthy', () => {
      fixture.detectChanges();

      expect(feedErrorCard()).toBeNull();
    });

    it('should report a failed feed synchronization', () => {
      componentRef.setInput('hasErrorLoadingBites', true);

      fixture.detectChanges();

      expect(feedErrorCard()).not.toBeNull();
    });

    it('should keep the known bites next to the error', () => {
      componentRef.setInput('bites', [createBite({ id: '1', name: 'Burger' })]);
      componentRef.setInput('hasErrorLoadingBites', true);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('bt-bite')).toBeTruthy();
    });

    it('should ask for another synchronization on retry', () => {
      componentRef.setInput('hasErrorLoadingBites', true);
      fixture.detectChanges();

      const refreshSpy = jest.spyOn(component.refresh, 'emit');

      fixture.nativeElement
        .querySelector('[data-testid="feed-error-retry"]')
        ?.click();

      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('should call scrollToTop on ionContent when scrollToTop is called', () => {
    fixture.detectChanges();
    const ionContent = component.ionContent();
    if (!ionContent) {
      throw new Error('Expected ion-content to be available');
    }
    const scrollToTopMock = jest
      .spyOn(ionContent, 'scrollToTop')
      .mockResolvedValue();

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
    it('exposes the header menu as a coach-mark anchor', () => {
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="btn-menu"]'),
      ).toBeTruthy();
    });

    it('exposes the feed controls as a coach-mark anchor', () => {
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="home-feed-controls"]',
        ),
      ).toBeTruthy();
    });

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

      fixture.nativeElement
        .querySelector('[data-testid="search-chip"]')
        .click();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('filters', () => {
    it('should emit filtersChanged when bt-home-feed-controls emits filtersChanged', () => {
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.filtersChanged, 'emit');
      const filterSelection = {
        tagFilters: ['filter1'],
        distanceFilter: '10',
        priceFilter: 20,
      };

      const homeFeedControls = fixture.debugElement.query(
        By.directive(HomeFeedControlsComponent),
      );
      homeFeedControls.componentInstance.filtersChanged.emit(filterSelection);

      expect(emitSpy).toHaveBeenCalledWith(filterSelection);
    });

    it('should emit filterCleared when bt-home-feed-controls emits filterCleared', () => {
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.filterCleared, 'emit');

      const homeFeedControls = fixture.debugElement.query(
        By.directive(HomeFeedControlsComponent),
      );
      homeFeedControls.componentInstance.filterCleared.emit();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('onLoadMore', () => {
    it('should load more bites when there are more to show', () => {
      const bites = Array.from({ length: 100 }, (_, index) =>
        createBite({ id: `${index}` }),
      );
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
      createBite({ id: '1', name: 'Burger', place: 'Burger Place' }),
      createBite({ id: '2', name: 'Pizza', place: 'Pizza Place' }),
      createBite({ id: '3', name: 'Sushi', place: 'Sushi Bar' }),
    ];

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
      const input = document.createElement('input');
      input.value = 'Sushi';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
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
  describe('email verification prompt', () => {
    const resendButton = (): (HTMLElement & { disabled?: boolean }) | null =>
      fixture.nativeElement.querySelector(
        '[data-testid="home-resend-verification-email"]',
      );

    const showPrompt = (resendRunning: boolean): void => {
      componentRef.setInput('showEmailVerificationPrompt', true);
      componentRef.setInput('emailVerificationResendRunning', resendRunning);
      fixture.detectChanges();
    };

    it('should offer an enabled resend button while idle', () => {
      showPrompt(false);

      const button = resendButton();

      expect(button).not.toBeNull();
      expect(button?.disabled).toBe(false);
      expect(button?.querySelector('ion-spinner')).toBeNull();
    });

    it('should show progress and block another tap while resending', () => {
      showPrompt(true);

      const button = resendButton();

      expect(button?.disabled).toBe(true);
      expect(button?.querySelector('ion-spinner')).not.toBeNull();
    });

    it('should become actionable again once the resend settles', () => {
      // A recoverable failure releases the running flag, so the prompt has to
      // return to its tappable idle state.
      showPrompt(true);
      showPrompt(false);

      const button = resendButton();
      const resendSpy = jest.spyOn(component.resendEmailVerification, 'emit');

      expect(button?.disabled).toBe(false);
      expect(button?.querySelector('ion-spinner')).toBeNull();

      button?.click();

      expect(resendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
