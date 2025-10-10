import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteEffects } from '../effects';
import { rootEffectsInit } from '@ngrx/effects';
import {
  deleteBite,
  loadedBiteCreator,
  loadedBitesFromApi,
  noPublicCreatorForBite,
  saveExistingBite,
  saveNewBite,
  saveTags,
} from '../actions';
import { Bite } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { bite } from '../selectors';
import SpyInstance = jest.SpyInstance;
import { fromAuth } from 'ta-firestore';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const Mock = {
  bites$: (): Observable<any> => of([]),
  saveNewBite: jest.fn(),
  saveEditedBite: jest.fn(),
  saveTagsToExistingBite: jest.fn(),
  deleteBite: jest.fn(),
  getUserByBiteId: jest.fn(),
};

const BITE_MOCK = {
  id: 'biteId',
} as Bite;

describe('BiteEffects', () => {
  let scheduler: TestScheduler;
  let actions$: Observable<any> = of({});
  let effects: BiteEffects;
  let apiService: BiteTribeApiService;
  let store: MockStore;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        BiteEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            bites: {
              ids: [],
              entities: {},
            },
          },
        }),
        { provide: BiteTribeApiService, useValue: Mock },
      ],
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(bite, BITE_MOCK);
    effects = TestBed.inject(BiteEffects);
    apiService = TestBed.inject(BiteTribeApiService);
  });

  describe('loadBitesFromApi$', () => {
    it('should load bites from API on loginSucceeded', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', { a: fromAuth.loginSucceeded });

        const expected = 'a';
        const output = {
          a: loadedBitesFromApi({ bites: [] }),
        };

        expectObservable(effects.startListener$).toBe(expected, output);
      });
    });
  });

  describe('saveNewBiteToFirestore$', () => {
    let saveNewBiteSpy: SpyInstance;

    beforeEach(() => {
      saveNewBiteSpy = jest
        .spyOn(apiService, 'saveNewBite')
        .mockImplementation();
    });

    it('should run saveNewBite on saveNewBite', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: saveNewBite({
            bite: {} as Bite,
          }),
        });

        expectObservable(effects.saveNewBiteToFirestore$);
      });
      expect(saveNewBiteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveEditedBiteToFirestore$', () => {
    let saveEditedBiteSpy: SpyInstance;

    beforeEach(() => {
      saveEditedBiteSpy = jest
        .spyOn(apiService, 'saveEditedBite')
        .mockImplementation();
    });

    it('should run saveEditedBite on saveExistingBite', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: saveExistingBite({
            bite: {} as Bite,
          }),
        });

        expectObservable(effects.saveEditedBiteToFirestore$);
      });
      expect(saveEditedBiteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveTagsToExistingBite$', () => {
    let saveTagsToExistingBiteSpy: SpyInstance;

    beforeEach(() => {
      saveTagsToExistingBiteSpy = jest
        .spyOn(apiService, 'saveTagsToExistingBite')
        .mockImplementation();
    });

    it('should run saveTagsToExistingBite on saveTags', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: saveTags({
            newTags: ['tag'],
            id: 'biteId',
          }),
        });

        expectObservable(effects.saveTagsToExistingBite$);
      });
      expect(saveTagsToExistingBiteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteBite$', () => {
    let deleteBiteSpy: SpyInstance;

    beforeEach(() => {
      deleteBiteSpy = jest.spyOn(apiService, 'deleteBite').mockImplementation();
    });

    it('should run deleteBite on deleteBite', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: deleteBite({
            bite: {} as Bite,
          }),
        });

        expectObservable(effects.deleteBite$);
      });
      expect(deleteBiteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadUserFromBite$', () => {
    let getUserByBiteIdSpy: SpyInstance;
    const BITE_CREATOR_MOCK = {
      snapshot: {
        data: {} as any,
      },
    } as any;

    beforeEach(() => {
      getUserByBiteIdSpy = jest
        .spyOn(apiService, 'getUserByBiteId')
        .mockReturnValue(of(BITE_CREATOR_MOCK));
    });

    it('should do nothing on non-bite url', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/list/' } } as any,
          }),
        });

        expectObservable(effects.loadUserFromBite$);
      });
      expect(getUserByBiteIdSpy).not.toHaveBeenCalled();
    });

    it('should return noPublicCreatorForBite on missing public creator', () => {
      getUserByBiteIdSpy.mockReturnValue(of({ snapshot: undefined }));
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/bite/' } } as any,
          }),
        });

        const expected = 'a';
        const output = { a: noPublicCreatorForBite() };

        expectObservable(effects.loadUserFromBite$).toBe(expected, output);
      });
      expect(getUserByBiteIdSpy).toHaveBeenCalledTimes(1);
    });

    it('should return loadedBiteCreator', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/bite/' } } as any,
          }),
        });

        expectObservable(effects.loadUserFromBite$);

        const expected = 'a';
        const output = {
          a: loadedBiteCreator({
            biteCreator: BITE_CREATOR_MOCK.snapshot.data,
          }),
        };

        expectObservable(effects.loadUserFromBite$).toBe(expected, output);
      });
    });
  });
});
