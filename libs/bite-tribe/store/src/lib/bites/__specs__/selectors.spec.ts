import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TestBed } from '@angular/core/testing';
import { editingBite } from '../selectors';
import { Bite } from 'model';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

describe('BitesSelectors', () => {
  let scheduler: TestScheduler;
  let mockStore: MockStore;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    });

    mockStore = TestBed.inject(MockStore);
  });

  describe('editingBite', () => {
    const biteMock = {} as Bite;

    beforeEach(() => {
      mockStore.overrideSelector(editingBite, biteMock);
    });

    it('should return editingBite', () => {
      scheduler.run(({ expectObservable }) => {
        const result$ = mockStore.select(editingBite);

        const expected = 'a';

        const output = {
          a: biteMock,
        };

        expectObservable(result$).toBe(expected, output);
      });
    });
  });
});
