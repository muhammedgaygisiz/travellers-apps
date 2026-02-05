/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { BiteContainer } from '../bite-container.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

jest.mock('@capacitor-firebase/analytics');
jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe('BiteContainer', () => {
  let component: BiteContainer;
  let fixture: ComponentFixture<BiteContainer>;
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
            position: signal(undefined),
            image: signal(undefined),
            submitNewBite: (): void => {},
            setEditingBite: (): jest.Mock => jest.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BiteContainer);
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
});
