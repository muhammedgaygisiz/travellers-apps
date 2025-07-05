import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController, provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { BiteTribeHomeComponent } from '../home.component';
import { ComponentRef, signal } from '@angular/core';
import { addIcons } from 'ionicons';
import { add, menuOutline } from 'ionicons/icons';
import { Dialog } from '@angular/cdk/dialog';
import { Subject } from 'rxjs';
import { CustomFilterModalComponent } from '../../custom-filter-modal/custom-filter-modal.component';

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;
  let navController: NavController;
  let componentRef: ComponentRef<BiteTribeHomeComponent>;
  let dialogOpenSpy: jest.SpyInstance;
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
    dialogOpenSpy = jest.spyOn(dialogMock, 'open');
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

  it('should open custom filter modal and emit filtersCleared', () => {
    const filtersClearedSpy = jest.spyOn(component.filtersCleared, 'emit');
    component.openCustomFilterModal();
    expect(dialogOpenSpy).toHaveBeenCalledWith(
      CustomFilterModalComponent,
      expect.any(Object)
    );
    closedSubject.next({ clearFilters: true });
    expect(filtersClearedSpy).toHaveBeenCalled();
  });

  it('should open custom filter modal and emit filtersApplied', () => {
    const filtersAppliedSpy = jest.spyOn(component.filtersApplied, 'emit');
    component.openCustomFilterModal();
    closedSubject.next({ selectedTags: ['tag1', 'tag2'] });
    expect(filtersAppliedSpy).toHaveBeenCalledWith(['tag1', 'tag2']);
  });

  it('should emit filterRemoved when removeFilter is called', () => {
    const filterRemovedSpy = jest.spyOn(component.filterRemoved, 'emit');
    component.removeFilter('test-filter');
    expect(filterRemovedSpy).toHaveBeenCalledWith('test-filter');
  });

  it('should call scrollToTop on ionContent when scrollToTop is called', () => {
    const scrollToTopMock = jest.fn();
    component.ionContent = signal({
      scrollToTop: scrollToTopMock,
    } as any) as any;

    component.scrollToTop();
    expect(scrollToTopMock).toHaveBeenCalledWith(300);
  });
});
