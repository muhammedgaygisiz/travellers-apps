import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BucketListEffect } from '../effects';
import {
  createAndSaveBiteIdToBucketList,
  createBucketList,
  loadedBucketlistsFromApi,
  removeBiteFromBucketlist,
  saveBiteIdToBucketList,
} from '../actions';
import { fromAuth } from 'ta-firestore';
import SpyInstance = jest.SpyInstance;

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  bucketlists$: (): Observable<any> => of([]),
  saveBiteIdToBucketList: jest.fn(),
  createBucketListAndSaveBiteIdToBucketList: jest.fn(),
  removeBiteFromBucketlist: jest.fn(),
  createBucketList: jest.fn(),
};

describe('BucketListEffect', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: BucketListEffect;
  let apiService: BiteTribeApiService;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        BucketListEffect,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: BiteTribeApiService, useValue: Mock },
      ],
    });

    effects = TestBed.inject(BucketListEffect);
    apiService = TestBed.inject(BiteTribeApiService);
  });

  describe('loadBucketlistsFromApi$', () => {
    it('should load bucketlists from API on ROOT_EFFECTS_INIT', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', { a: fromAuth.AuthActions.loginSucceeded });

        const expected = 'a';
        const output = {
          a: loadedBucketlistsFromApi({ bucketlists: [] }),
        };

        expectObservable(effects.startListener$).toBe(expected, output);
      });
    });
  });

  describe('saveBiteIdToBucketListEffect$', () => {
    let saveBiteIdToBucketListSpy: SpyInstance;

    beforeEach(() => {
      saveBiteIdToBucketListSpy = jest
        .spyOn(apiService, 'saveBiteIdToBucketList')
        .mockImplementation();
    });

    it('should run saveBiteIdToBucketList on saveBiteIdToBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: saveBiteIdToBucketList({
            bucketListId: 'bucketListId',
            biteId: 'biteId',
          }),
        });

        expectObservable(effects.saveBiteIdToBucketListEffect$);
      });
      expect(saveBiteIdToBucketListSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBucketlistAndSaveBiteIdToBucketListEffect$', () => {
    let createBucketListAndSaveBiteIdToBucketListSpy: SpyInstance;

    beforeEach(() => {
      createBucketListAndSaveBiteIdToBucketListSpy = jest
        .spyOn(apiService, 'createBucketListAndSaveBiteIdToBucketList')
        .mockImplementation();
    });

    it('should run createBucketListAndSaveBiteIdToBucketList on createAndSaveBiteIdToBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: createAndSaveBiteIdToBucketList({
            bucketListName: 'bucketListName',
            biteId: 'biteId',
          }),
        });

        expectObservable(
          effects.createBucketlistAndSaveBiteIdToBucketListEffect$,
        );
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
        .mockImplementation();
    });

    it('should run removeBiteFromBucketlist on removeBiteFromBucketlist', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: removeBiteFromBucketlist({
            bucketlistId: 'bucketlistId',
            biteId: 'biteId',
          }),
        });

        expectObservable(effects.removeBiteFromBucketlistEffect);
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
          a: createBucketList({
            bucketlistName: 'bucketlistName',
          }),
        });

        expectObservable(effects.createBucketlistEffect$);
      });
      expect(createBucketListSpy).toHaveBeenCalledTimes(1);
    });
  });
});
