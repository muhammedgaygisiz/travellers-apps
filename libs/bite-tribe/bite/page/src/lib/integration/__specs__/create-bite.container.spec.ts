/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { CreateBiteContainer } from '../create-bite.container';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

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
            cachedBite: signal(undefined),
            currency: signal(undefined),
            effectiveCurrency: signal(undefined),
            position: signal(undefined),
            image: signal(undefined),
            submitNewBite: (): void => {},
            setEditingBite: (): jest.Mock => jest.fn(),
            determineCurrencyForPosition: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(CreateBiteContainer);
    component = fixture.componentInstance;
    biteServiceMock = TestBed.inject(BiteService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

  describe('onPlaceChange', () => {
    let setEditingBiteSpy: jest.SpyInstance;
    const testPlace = 'Test Place';

    beforeEach(() => {
      setEditingBiteSpy = jest.spyOn(biteServiceMock, 'setEditingBite');
    });

    describe('given a cached bite', () => {
      const existingBite = { id: '123', place: 'Old Place' };

      beforeEach(() => {
        (biteServiceMock.cachedBite as any) = signal(existingBite);
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
        (biteServiceMock.cachedBite as any) = signal(undefined);
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
