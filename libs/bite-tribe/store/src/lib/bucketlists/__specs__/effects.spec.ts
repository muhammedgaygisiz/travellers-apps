import { TestScheduler } from 'rxjs/testing';
import { Observable, of, throwError } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BucketListEffect } from '../effects';
import { BucketlistActions } from '../actions';
import SpyInstance = jest.SpyInstance;
import { AuthService } from 'ta-firestore';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import type { Action } from '@ngrx/store';

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const BiteTribeApiServiceMock = {
  loadBucketlistsByUserId: jest.fn(),
  saveBiteIdToBucketList: jest.fn(),
  createBucketListAndSaveBiteIdToBucketList: jest.fn(),
  removeBiteFromBucketlist: jest.fn(),
  createBucketList: jest.fn(),
  updateBucketlistTriedOutStatus: jest.fn(),
  createBucketListFromBiteTrail: jest.fn(),
};

const MockedAuthService = {
  getUser: (): ReturnType<AuthService['getUser']> =>
    ({ uid: '123' }) as ReturnType<AuthService['getUser']>,
};

const mockToastCreate = jest.fn().mockResolvedValue({ present: jest.fn() });
const MockToastController = {
  create: mockToastCreate,
};

const mockNavigateForward = jest.fn();
const MockNavController = {
  navigateForward: mockNavigateForward,
};

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
};

describe('BucketListEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<Action> = of({ type: 'INIT' });
  let effects: BucketListEffect;
  let apiService: BiteTribeApiService;
  let authService: AuthService;

  beforeEach(() => {
    mockToastCreate.mockResolvedValue({ present: jest.fn() });
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        BucketListEffect,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
        { provide: AuthService, useValue: MockedAuthService },
        { provide: ToastController, useValue: MockToastController },
        { provide: NavController, useValue: MockNavController },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    effects = TestBed.inject(BucketListEffect);
    apiService = TestBed.inject(BiteTribeApiService);
    authService = TestBed.inject(AuthService);

    jest
      .spyOn(authService, 'getUser')
      .mockImplementation(
        () => ({ uid: '123' }) as unknown as ReturnType<AuthService['getUser']>,
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadMyBucketlists$', () => {
    describe('given no user', () => {
      beforeEach(() => {
        jest.spyOn(authService, 'getUser').mockReturnValue(null);
      });

      it('should not load bucketlists', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BucketlistActions.removedBiteFromBucketlist(),
          });

          expectObservable(effects.loadMyBucketlists$).toBe('');
        });
      });
    });

    describe('given a user with uid', () => {
      it('should load bucketlists by user id', () => {
        const loadBucketlistsByUserIdSpy = jest
          .spyOn(apiService, 'loadBucketlistsByUserId')
          .mockReturnValue(
            of([]) as unknown as ReturnType<
              BiteTribeApiService['loadBucketlistsByUserId']
            >,
          );

        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BucketlistActions.removedBiteFromBucketlist(),
          });

          expectObservable(effects.loadMyBucketlists$).toBe('a', {
            a: BucketlistActions.loadedFromAPI({ bucketlists: [] }),
          });
        });

        expect(loadBucketlistsByUserIdSpy).toHaveBeenCalledWith('123');
      });
    });

    describe('given a saved BiteTrail', () => {
      it('should reload bucketlists so the trail page sees the new one', () => {
        jest
          .spyOn(apiService, 'loadBucketlistsByUserId')
          .mockReturnValue(
            of([]) as unknown as ReturnType<
              BiteTribeApiService['loadBucketlistsByUserId']
            >,
          );

        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', {
            a: BucketlistActions.savedBiteTrailAsBucketList(),
          });

          expectObservable(effects.loadMyBucketlists$).toBe('a', {
            a: BucketlistActions.loadedFromAPI({ bucketlists: [] }),
          });
        });
      });
    });
  });

  describe('saveBiteIdToBucketListEffect$', () => {
    let saveBiteIdToBucketListSpy: SpyInstance;

    beforeEach(() => {
      saveBiteIdToBucketListSpy = jest
        .spyOn(apiService, 'saveBiteIdToBucketList')
        .mockReturnValue(
          of({}) as unknown as ReturnType<
            BiteTribeApiService['saveBiteIdToBucketList']
          >,
        );
    });

    it('should run saveBiteIdToBucketList on saveBiteIdToBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.saveBiteToBucketlist({
            bucketListId: 'bucketListId',
            biteId: 'biteId',
          }),
        });

        expectObservable(effects.saveBiteIdToBucketListEffect$).toBe('a', {
          a: BucketlistActions.savedBiteToBucketlist({
            bucketlist: {} as unknown as Parameters<
              typeof BucketlistActions.savedBiteToBucketlist
            >[0]['bucketlist'],
          }),
        });
      });

      expect(saveBiteIdToBucketListSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBucketlistAndSaveBiteIdToBucketListEffect$', () => {
    let createBucketListAndSaveBiteIdToBucketListSpy: SpyInstance;

    beforeEach(() => {
      createBucketListAndSaveBiteIdToBucketListSpy = jest
        .spyOn(apiService, 'createBucketListAndSaveBiteIdToBucketList')
        .mockImplementation(
          () =>
            of({}) as unknown as ReturnType<
              BiteTribeApiService['createBucketListAndSaveBiteIdToBucketList']
            >,
        );
    });

    it('should run createBucketListAndSaveBiteIdToBucketList on createAndSaveBiteIdToBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.createAndSaveBiteIdToBucketlist({
            bucketListName: 'bucketListName',
            biteId: 'biteId',
          }),
        });

        expectObservable(
          effects.createBucketlistAndSaveBiteIdToBucketListEffect$,
        ).toBe('a', {
          a: BucketlistActions.createdBucketlistAndSavedBiteToIt(),
        });
      });
      expect(
        createBucketListAndSaveBiteIdToBucketListSpy,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeBiteFromBucketlistEffect', () => {
    let removeBiteFromBucketlistSpy: SpyInstance;

    beforeEach(() => {
      removeBiteFromBucketlistSpy = jest
        .spyOn(apiService, 'removeBiteFromBucketlist')
        .mockImplementation(
          () =>
            of({}) as unknown as ReturnType<
              BiteTribeApiService['removeBiteFromBucketlist']
            >,
        );
    });

    it('should run removeBiteFromBucketlist on removeBiteFromBucketlist', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.removeBiteFromBucketlist({
            bucketlistId: 'bucketlistId',
            biteId: 'biteId',
          }),
        });

        expectObservable(effects.removeBiteFromBucketlistEffect).toBe('a', {
          a: BucketlistActions.removedBiteFromBucketlist(),
        });
      });
      expect(removeBiteFromBucketlistSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBucketlistEffect$', () => {
    let createBucketListSpy: SpyInstance;

    beforeEach(() => {
      createBucketListSpy = jest
        .spyOn(apiService, 'createBucketList')
        .mockImplementation();
    });

    it('should run createBucketList on createBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.createBucketlist({
            bucketlistName: 'bucketlistName',
          }),
        });

        expectObservable(effects.createBucketlistEffect$);
      });
      expect(createBucketListSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveBiteTrailAsBucketListEffect$', () => {
    let createBucketListFromBiteTrailSpy: SpyInstance;

    beforeEach(() => {
      createBucketListFromBiteTrailSpy = jest
        .spyOn(apiService, 'createBucketListFromBiteTrail')
        .mockImplementation(
          () =>
            of({}) as unknown as ReturnType<
              BiteTribeApiService['createBucketListFromBiteTrail']
            >,
        );
    });

    it('should call createBucketListFromBiteTrail and dispatch savedBiteTrailAsBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.saveBiteTrailAsBucketList({
            biteTrailId: '',
            bucketListName: 'My Trail',
            biteIds: ['bite-1', 'bite-2'],
          }),
        });

        expectObservable(effects.saveBiteTrailAsBucketListEffect$).toBe('a', {
          a: BucketlistActions.savedBiteTrailAsBucketList(),
        });
      });
      expect(createBucketListFromBiteTrailSpy).toHaveBeenCalledWith({
        bucketListName: 'My Trail',
        biteIds: ['bite-1', 'bite-2'],
        biteTrailId: '',
        type: BucketlistActions.saveBiteTrailAsBucketList.type,
      });
    });
  });

  describe('setBiteTriedOutStatusEffect$', () => {
    let updateBucketlistTriedOutStatusSpy: SpyInstance;

    beforeEach(() => {
      updateBucketlistTriedOutStatusSpy = jest
        .spyOn(apiService, 'updateBucketlistTriedOutStatus')
        .mockImplementation(
          () =>
            of({}) as unknown as ReturnType<
              BiteTribeApiService['updateBucketlistTriedOutStatus']
            >,
        );
    });

    it('should call updateBucketlistTriedOutStatus and dispatch success action', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.setBiteTriedOutStatus({
            bucketlistId: 'bucketlistId',
            biteId: 'biteId',
            checked: true,
          }),
        });

        expectObservable(effects.setBiteTriedOutStatusEffect$).toBe('a', {
          a: BucketlistActions.setBiteTriedOutStatusSucceeded(),
        });
      });

      expect(updateBucketlistTriedOutStatusSpy).toHaveBeenCalledWith({
        bucketlistId: 'bucketlistId',
        biteId: 'biteId',
        checked: true,
      });
    });

    it('should dispatch failed action when updateBucketlistTriedOutStatus fails', () => {
      updateBucketlistTriedOutStatusSpy.mockImplementationOnce(() => {
        return throwError(() => new Error('Failed')) as unknown as ReturnType<
          BiteTribeApiService['updateBucketlistTriedOutStatus']
        >;
      });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.setBiteTriedOutStatus({
            bucketlistId: 'bucketlistId',
            biteId: 'biteId',
            checked: true,
          }),
        });

        expectObservable(effects.setBiteTriedOutStatusEffect$).toBe('a', {
          a: BucketlistActions.setBiteTriedOutStatusFailed(),
        });
      });
    });
  });
});
