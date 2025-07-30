import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController, provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { BiteTribeHomeComponent } from '../home.component';
import { ComponentRef, signal } from '@angular/core';
import { addIcons } from 'ionicons';
import { add, menuOutline } from 'ionicons/icons';
import { Dialog } from '@angular/cdk/dialog';
import { Subject } from 'rxjs';
import SpyInstance = jest.SpyInstance;

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
});
