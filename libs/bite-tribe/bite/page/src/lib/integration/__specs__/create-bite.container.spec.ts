/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { CreateBiteContainer } from '../create-bite.container';
import { BitePage } from '../../components/page/bite.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { Bite } from 'model';

jest.mock('@capacitor-firebase/analytics');
jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

jest.spyOn(console, 'warn').mockImplementation(() => {
  // Mock implementation
});

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const mockCachedBite = signal<Partial<Bite> | undefined>(undefined);

describe(CreateBiteContainer.name, () => {
  let component: CreateBiteContainer;
  let fixture: ComponentFixture<CreateBiteContainer>;
  let biteServiceMock: BiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BiteService,
          useValue: {
            cachedBite: mockCachedBite,
            currency: signal(undefined),
            effectiveCurrency: signal(undefined),
            position: signal(undefined),
            image: signal(undefined),
            isCurrencyLoading: signal(false),
            favCurrencies: signal([]),
            nearbyRestaurants: signal([]),
            tagSuggestionsForEditingBite: signal([]),
            googlePlaces: signal([]),
            googlePlacesLoading: signal(false),
            nearbyGooglePlaces: signal([]),
            nearbyGooglePlacesLoading: signal(false),
            submitNewBite: (): void => {},
            submitNewBiteAndAddAnother: (): void => {},
            searchGooglePlaces: jest.fn(),
            loadNearbyGooglePlaces: jest.fn(),
            setEditingBite: (): jest.Mock => jest.fn(),
            clearCachedBite: jest.fn(),
            determineCurrencyForPosition: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(CreateBiteContainer);
    component = fixture.componentInstance;
    biteServiceMock = TestBed.inject(BiteService);
    mockCachedBite.set(undefined);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should head the form as a creation', () => {
    fixture.detectChanges();

    const page = fixture.debugElement.query(By.directive(BitePage))
      .componentInstance as BitePage;

    expect(page.titleKey()).toBe('create-bite');
  });

  describe('ionViewDidEnter', () => {
    let setCurrentScreenSpy: jest.SpyInstance;

    beforeEach(() => {
      setCurrentScreenSpy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    });

    it('should set current screen to "New Bite"', () => {
      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'New Bite',
      });
    });
  });

  describe('leaving the create form', () => {
    it('should discard the prefilled draft so the next creation starts clean', () => {
      mockCachedBite.set({
        name: 'Amok Trey',
        place: 'Khmer Kitchen',
        restaurantId: 'restaurant-1',
      });

      fixture.destroy();

      expect(biteServiceMock.clearCachedBite).toHaveBeenCalled();
    });
  });

  describe('onPlaceChange', () => {
    let setEditingBiteSpy: jest.SpyInstance;
    const testPlace = 'Test Place';

    beforeEach(() => {
      setEditingBiteSpy = jest.spyOn(biteServiceMock, 'setEditingBite');
    });

    describe('given a cached bite', () => {
      const existingBite = { id: '123', place: 'Old Place' };

      beforeEach(() => {
        mockCachedBite.set(existingBite);
      });

      it('should call setEditingBite with updated place', () => {
        component.onPlaceChange(testPlace);

        expect(setEditingBiteSpy).toHaveBeenCalledWith({
          id: '123',
          place: testPlace,
        });
      });
    });

    describe('given no cached bite', () => {
      beforeEach(() => {
        mockCachedBite.set(undefined);
      });

      it('should call setEditingBite with new bite containing place', () => {
        component.onPlaceChange(testPlace);

        expect(setEditingBiteSpy).toHaveBeenCalledWith({
          place: testPlace,
        });
      });
    });
  });

  describe('onPositionChange', () => {
    it('should ask the service to determine the currency for the position', () => {
      const position = { latitude: 11.55, longitude: 104.91 };

      component.onPositionChange(position);

      expect(biteServiceMock.determineCurrencyForPosition).toHaveBeenCalledWith(
        position,
      );
    });
  });
});
