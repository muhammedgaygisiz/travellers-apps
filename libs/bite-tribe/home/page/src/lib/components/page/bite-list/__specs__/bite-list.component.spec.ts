import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { IonItemSliding, provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteListComponent } from '../bite-list.component';
import type { Bite } from 'model';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const createBite = (id: string, name: string): Bite => ({
  id,
  name,
  image: '',
  place: 'Bite Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
});

describe('BiteListComponent', () => {
  let component: BiteListComponent;
  let fixture: ComponentFixture<BiteListComponent>;
  let componentRef: ComponentRef<BiteListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(BiteListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty feed message when there are no bites', () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="empty-feed-message"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="empty-search-message"]',
      ),
    ).toBeNull();
  });

  it('should blame the search term instead of the empty feed when a search excludes everything', () => {
    componentRef.setInput('searchTerm', 'zzzznomatch');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="empty-search-message"]',
      ),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="empty-feed-message"]'),
    ).toBeNull();
  });

  it('should emit clearSearch when the clear search button is clicked', () => {
    const emitSpy = jest.spyOn(component.clearSearch, 'emit');
    componentRef.setInput('searchTerm', 'zzzznomatch');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="clear-search"]').click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should keep the search empty state out of a list that still has bites', () => {
    componentRef.setInput('bites', [createBite('bite-1', 'Burger')]);
    componentRef.setInput('searchTerm', 'burger');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="empty-search-message"]',
      ),
    ).toBeNull();
  });

  it('should render a bt-bite for each bite', () => {
    componentRef.setInput('bites', [
      createBite('bite-1', 'Burger'),
      createBite('bite-2', 'Pizza'),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('bt-bite').length).toBe(2);
  });

  it('should show the skeleton list and hide the bites while loading', () => {
    componentRef.setInput('bites', [createBite('bite-1', 'Burger')]);
    componentRef.setInput('showSkeleton', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('bt-bite')).toBeNull();
  });

  it('should keep the bites unwrapped when the tried-out swipe is disabled', () => {
    componentRef.setInput('bites', [createBite('bite-1', 'Burger')]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-item-sliding')).toBeNull();
  });

  it('should wrap every bite in a sliding item when the tried-out swipe is enabled', () => {
    componentRef.setInput('bites', [
      createBite('bite-1', 'Burger'),
      createBite('bite-2', 'Pizza'),
    ]);
    componentRef.setInput('enableTriedOutSwipe', true);
    fixture.detectChanges();

    const slidingItems =
      fixture.nativeElement.querySelectorAll('ion-item-sliding');

    expect(slidingItems.length).toBe(2);
    expect(slidingItems[0].getAttribute('data-testid')).toBe(
      'bite-tried-out-swipe',
    );
    expect(slidingItems[1].getAttribute('data-testid')).toBeNull();
  });

  it('should mark a tried-out bite so it reads as done in the list', () => {
    componentRef.setInput('bites', [
      createBite('bite-1', 'Burger'),
      createBite('bite-2', 'Pizza'),
    ]);
    componentRef.setInput('enableTriedOutSwipe', true);
    componentRef.setInput('triedOutBiteIds', ['bite-1']);
    fixture.detectChanges();

    const slidingItems =
      fixture.nativeElement.querySelectorAll('ion-item-sliding');

    expect(slidingItems[0].classList).toContain('tried-out');
    expect(slidingItems[0].querySelector('.tried-out-badge')).toBeTruthy();
    expect(slidingItems[1].classList).not.toContain('tried-out');
    expect(slidingItems[1].querySelector('.tried-out-badge')).toBeNull();
  });

  describe('onTriedOutAction', () => {
    it('should emit triedOutChange as checked for a bite that was not tried out', () => {
      const emitSpy = jest.spyOn(component.triedOutChange, 'emit');
      const slidingItem = { close: jest.fn() } as unknown as IonItemSliding;

      component.onTriedOutAction('bite-1', false, slidingItem);

      expect(emitSpy).toHaveBeenCalledWith({ biteId: 'bite-1', checked: true });
      expect(slidingItem.close).toHaveBeenCalled();
    });

    it('should emit triedOutChange as unchecked for a bite that was already tried out', () => {
      const emitSpy = jest.spyOn(component.triedOutChange, 'emit');
      const slidingItem = { close: jest.fn() } as unknown as IonItemSliding;

      component.onTriedOutAction('bite-1', true, slidingItem);

      expect(emitSpy).toHaveBeenCalledWith({
        biteId: 'bite-1',
        checked: false,
      });
      expect(slidingItem.close).toHaveBeenCalled();
    });
  });

  describe('onIonInfinite', () => {
    it('should emit loadMore and complete the event', () => {
      const emitSpy = jest.spyOn(component.loadMore, 'emit');
      const infiniteScrollEvent = {
        target: {
          complete: jest.fn(),
        },
      } as unknown as InfiniteScrollCustomEvent;

      component.onIonInfinite(infiniteScrollEvent);

      expect(emitSpy).toHaveBeenCalled();
      expect(infiniteScrollEvent.target.complete).toHaveBeenCalled();
    });
  });
});
