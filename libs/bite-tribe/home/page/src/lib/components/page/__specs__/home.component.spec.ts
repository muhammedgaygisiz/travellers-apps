import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeHomeComponent } from '../home.component';
import { ComponentRef } from '@angular/core';
import { Bite } from 'model';
import { addIcons } from 'ionicons';
import { add, menuOutline } from 'ionicons/icons';

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;
  let navController: NavController;
  let componentRef: ComponentRef<BiteTribeHomeComponent>;

  beforeEach(() => {
    navController = {
      navigateForward: jest.fn(),
    } as Partial<NavController> as NavController;

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: NavController, useValue: navController },
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

  it('should navigate to new-bite page on add button click', () => {
    const navSpy = jest.spyOn(navController, 'navigateForward');

    component.onAddButtonClicked();

    expect(navSpy).toHaveBeenCalledWith(['new-bite']);
  });

  it('should navigate to bite page on bite click', () => {
    const navSpy = jest.spyOn(navController, 'navigateForward');

    component.onBiteClicked({ id: '5' } as Bite);

    expect(navSpy).toHaveBeenCalledWith(['bite', '5']);
  });
});
