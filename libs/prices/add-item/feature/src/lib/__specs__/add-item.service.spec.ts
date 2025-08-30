import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { AddItemService } from '../integration/add-item.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TestBed } from '@angular/core/testing';
import {
  fromLocalization,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { SupportedLang } from 'localization';

jest.mock('localization');

const assertDeepEqual = (actual: [], expected: []): void => {
  expect(actual).toEqual(expected);
};

describe('AddItemService', () => {
  let scheduler: TestScheduler;
  let service: AddItemService;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    const initialState = { location: 'Berne' };
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    service = TestBed.inject<AddItemService>(AddItemService);
    const store = TestBed.inject(MockStore);
    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  describe('location$', () => {
    it('should return Berne', () =>
      scheduler.run(({ expectObservable }) => {
        const expected = 'a';
        const output = { a: 'Berne' };

        expectObservable(service.location$).toBe(expected, output);
      }));
  });

  describe('saveItem', () => {
    describe('given a price', () => {
      const PRICE = {
        productName: 'a',
        price: 10,
        src: 'src',
        location: 'location',
      };

      it('should dispatch save item action', () => {
        service.saveItem(PRICE);

        expect(dispatchSpy).toHaveBeenCalledWith(
          fromMostSearched.saveItem({ item: PRICE })
        );
      });
    });
  });

  describe('changeLanguage', () => {
    it('should dispatch change language action', () => {
      service.changeLanguage('fr' as SupportedLang);

      expect(dispatchSpy).toHaveBeenCalledWith(
        fromLocalization.changeLanguage({ lang: 'fr' as SupportedLang })
      );
    });
  });
});
