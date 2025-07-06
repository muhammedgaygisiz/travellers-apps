import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { fromBites } from '../bites';
import SpyInstance = jest.SpyInstance;

describe('BiteTribeStoreService', () => {
  let service: BiteTribeStoreService;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    const initialState = { location: 'Berne' };
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    service = TestBed.inject<BiteTribeStoreService>(BiteTribeStoreService);
    const store = TestBed.inject(MockStore);
    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  describe('saveEditingBite', () => {
    let saveEditingBiteSpy: SpyInstance;

    beforeEach(() => {
      saveEditingBiteSpy = jest.spyOn(fromBites, 'saveEditingBite');
    });

    it('should call saveEditingBite with the correct bite', () => {
      const bite = { id: '123', name: 'Test Bite' };

      service.saveEditingBite(bite);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(saveEditingBiteSpy).toHaveBeenCalledTimes(1);
      expect(saveEditingBiteSpy).toHaveBeenCalledWith({ bite });
    });
  });
});
