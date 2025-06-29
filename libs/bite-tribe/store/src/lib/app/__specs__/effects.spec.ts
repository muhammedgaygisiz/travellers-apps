import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { AlertController, Platform } from '@ionic/angular';
import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed } from '@angular/core/testing';
import { fromAuth } from 'ta-firestore';
import {
  errorLoadingGpsPosition,
  fetchGpsPosition,
  loadedGpsPosition,
} from '../actions';
import { AppEffect } from '../effects';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';

const getCurrentPositionMock = jest.fn();
jest.mock('geolocation', () => ({
  getCurrentPosition: (): void => getCurrentPositionMock(),
}));

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn(),
  }),
};

describe('AppEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: AppEffect;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        AppEffect,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: AlertController, useValue: Mock },
        { provide: BiteTribeApiService, useValue: Mock },
        { provide: Platform, useValue: Mock },
      ],
    });

    effects = TestBed.inject(AppEffect);
  });

  describe('fetchGpsPosition$', () => {
    it('should emit loadedGpsPosition on successful location fetch', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const user = { id: 1 };
        const position = { coords: { latitude: 1, longitude: 2 } };

        getCurrentPositionMock.mockReturnValue(cold('--a|', { a: position }));

        actions$ = cold('a', { a: fromAuth.loadedUser({ user }) });

        const expected = '--a';
        const output = { a: loadedGpsPosition({ position }) };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });
    });

    it('should emit errorLoadingGpsPosition and show alert on error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      scheduler.run(({ cold, expectObservable }) => {
        const error = new Error('GPS Error');

        getCurrentPositionMock.mockReturnValue(cold('--#', {}, error));

        actions$ = cold('a', { a: fetchGpsPosition() });

        const expected = '--a';
        const output = { a: errorLoadingGpsPosition({ error }) };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
