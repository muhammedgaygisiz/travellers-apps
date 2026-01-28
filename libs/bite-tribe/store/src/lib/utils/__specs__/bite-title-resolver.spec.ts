import { TestScheduler } from 'rxjs/testing';
import { biteTitleResolver } from '../bite-title-resolver';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { bite } from '../../bites/selectors';
import type { Bite } from 'model';
import { Observable } from 'rxjs';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

describe('biteTitleResolver', () => {
  let scheduler: TestScheduler;

  const routeMock = jest.fn() as unknown as ActivatedRouteSnapshot;
  const stateMock = jest.fn() as unknown as RouterStateSnapshot;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    });
  });

  it('should work', () => {
    TestBed.runInInjectionContext(() => {
      const resolver = biteTitleResolver(routeMock, stateMock);

      expect(resolver).toBeDefined();
    });
  });

  describe('given a bite', () => {
    beforeEach(() => {
      const mockStore = TestBed.inject(MockStore);
      const mockBite = { name: 'My Bite' } as Bite;
      mockStore.overrideSelector(bite, mockBite);
    });

    describe('with bite name', () => {
      it('should return the bite name', () => {
        scheduler.run(({ expectObservable }) => {
          TestBed.runInInjectionContext(() => {
            const obs$ = biteTitleResolver(
              routeMock,
              stateMock,
            ) as Observable<string>;

            const expected = 'a';
            const output = { a: 'My Bite' };

            expectObservable(obs$).toBe(expected, output);
          });
        });
      });
    });

    describe('without bite name', () => {
      beforeEach(() => {
        const mockStore = TestBed.inject(MockStore);
        const mockBite = {} as Bite;
        mockStore.overrideSelector(bite, mockBite);
      });

      it('should return "Bite"', () => {
        scheduler.run(({ expectObservable }) => {
          TestBed.runInInjectionContext(() => {
            const obs$ = biteTitleResolver(
              routeMock,
              stateMock,
            ) as Observable<string>;

            const expected = 'a';
            const output = { a: 'Bite' };

            expectObservable(obs$).toBe(expected, output);
          });
        });
      });
    });
  });

  describe('given no bite', () => {
    beforeEach(() => {
      const mockStore = TestBed.inject(MockStore);
      mockStore.overrideSelector(bite, undefined);
    });

    it('should return "Bite"', () => {
      scheduler.run(({ expectObservable }) => {
        TestBed.runInInjectionContext(() => {
          const obs$ = biteTitleResolver(
            routeMock,
            stateMock,
          ) as Observable<string>;

          const expected = 'a';
          const output = { a: 'Bite' };

          expectObservable(obs$).toBe(expected, output);
        });
      });
    });
  });
});
