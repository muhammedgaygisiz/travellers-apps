import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { AddItemService } from '../integration/add-item.service';
import { provideMockStore } from '@ngrx/store/testing';
import { TestBed } from '@angular/core/testing';

const assertDeepEqual = (actual: [], expected: []) => {
  expect(actual).toEqual(expected);
};

describe('AddItemService', () => {
  let scheduler: TestScheduler;
  let service: AddItemService;

  beforeEach(async () => {
    scheduler = new TestScheduler(assertDeepEqual);

    const initialState = { location: 'Berne' };
    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    service = TestBed.inject<AddItemService>(AddItemService);
  });

  test('location$', () =>
    scheduler.run(({ expectObservable }) => {
      const expected = 'a';
      const output = { a: 'Berne' };

      expectObservable(service.location$).toBe(expected, output);
    }));
});
