import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BucketListEffect } from '../effects';
import { BucketlistActions } from '../actions';
import SpyInstance = jest.SpyInstance;
import { AuthService } from 'ta-firestore';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const BiteTribeApiServiceMock = {
  loadBucketlistsByUserId: jest.fn(),
  saveBiteIdToBucketList: jest.fn(),
  createBucketListAndSaveBiteIdToBucketList: jest.fn(),
  removeBiteFromBucketlist: jest.fn(),
  createBucketList: jest.fn(),
};

const MockedAuthService = {
  getUser: (): any => ({}),
};

describe('BucketListEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: BucketListEffect;
  let apiService: BiteTribeApiService;
  let authService: AuthService;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        BucketListEffect,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
        { provide: AuthService, useValue: MockedAuthService },
      ],
    });

    effects = TestBed.inject(BucketListEffect);
    apiService = TestBed.inject(BiteTribeApiService);
    authService = TestBed.inject(AuthService);

    jest
      .spyOn(authService, 'getUser')
      .mockImplementation(() => ({ uid: '123' }) as any);
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
          .mockReturnValue(of([]) as any);

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
  });

  describe('saveBiteIdToBucketListEffect$', () => {
    let saveBiteIdToBucketListSpy: SpyInstance;

    beforeEach(() => {
      saveBiteIdToBucketListSpy = jest
        .spyOn(apiService, 'saveBiteIdToBucketList')
        .mockReturnValue(of({}) as any);
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
          a: BucketlistActions.savedBiteToBucketlist({ bucketlist: {} as any }),
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
        .mockImplementation(() => of({}) as any);
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
        .mockImplementation(() => of({}) as any);
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
});
