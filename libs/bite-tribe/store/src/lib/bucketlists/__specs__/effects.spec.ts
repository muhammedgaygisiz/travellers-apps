import { beforeEach, describe, expect, it, vi, Mock as ViMock } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BucketListEffect } from '../effects';
import { BucketlistActions } from '../actions';
import { fromAuth } from 'ta-firestore';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  bucketlists$: (): Observable<any> => of([]),
  saveBiteIdToBucketList: vi.fn(),
  createBucketListAndSaveBiteIdToBucketList: vi.fn(),
  removeBiteFromBucketlist: vi.fn(),
  createBucketList: vi.fn(),
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
          a: BucketlistActions.loadedFromAPI({ bucketlists: [] }),
        };

        expectObservable(effects.startListener$).toBe(expected, output);
      });
    });
  });

  describe('saveBiteIdToBucketListEffect$', () => {
    let saveBiteIdToBucketListSpy: ViMock;

    beforeEach(() => {
      saveBiteIdToBucketListSpy = vi
        .spyOn(apiService, 'saveBiteIdToBucketList')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should run saveBiteIdToBucketList on saveBiteIdToBucketList', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.saveBiteToBucketlist({
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
    let createBucketListAndSaveBiteIdToBucketListSpy: ViMock;

    beforeEach(() => {
      createBucketListAndSaveBiteIdToBucketListSpy = vi
        .spyOn(apiService, 'createBucketListAndSaveBiteIdToBucketList')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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
        );
      });
      expect(
        createBucketListAndSaveBiteIdToBucketListSpy,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeBiteFromBucketlistEffect', () => {
    let removeBiteFromBucketlistSpy: ViMock;

    beforeEach(() => {
      removeBiteFromBucketlistSpy = vi
        .spyOn(apiService, 'removeBiteFromBucketlist')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should run removeBiteFromBucketlist on removeBiteFromBucketlist', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: BucketlistActions.removeBiteFromBucketlist({
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
    let createBucketListSpy: ViMock;

    beforeEach(() => {
      createBucketListSpy = vi
        .spyOn(apiService, 'createBucketList')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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
