import { TestBed } from '@angular/core/testing';
import { MenuDataAccessService } from '../menu-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Menu } from 'model';
import { Observable, of } from 'rxjs';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe(MenuDataAccessService.name, () => {
  let service: MenuDataAccessService;
  let apiMock: { saveMenu: jest.Mock };
  let storeMock: {
    bite$: Observable<unknown>;
    restaurant$: Observable<unknown>;
    menu$: Observable<unknown>;
    isMenuLoading$: Observable<boolean>;
    isMenuUnavailable$: Observable<boolean>;
    cacheBite: jest.Mock;
    retryMenuLoad: jest.Mock;
  };

  beforeEach(() => {
    apiMock = { saveMenu: jest.fn() };
    storeMock = {
      bite$: of(),
      restaurant$: of(),
      menu$: of(),
      isMenuLoading$: of(true),
      isMenuUnavailable$: of(false),
      cacheBite: jest.fn(),
      retryMenuLoad: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MenuDataAccessService,
        { provide: BiteTribeApiService, useValue: apiMock },
        { provide: BiteTribeStoreService, useValue: storeMock },
      ],
    });

    service = TestBed.inject(MenuDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveMenu', () => {
    it('should call saveMenu on BiteTribeApiService directly', () => {
      const menu = { id: 'menu-1', categories: [] } as unknown as Menu;

      service.saveMenu(menu);

      expect(apiMock.saveMenu).toHaveBeenCalledWith(menu);
    });
  });

  describe('retryMenuLoad', () => {
    it('should ask the store for the menu again', () => {
      service.retryMenuLoad();

      expect(storeMock.retryMenuLoad).toHaveBeenCalled();
    });
  });

  describe('prepareBiteFromMenuItem', () => {
    it('should call cacheBite from store service', () => {
      const menu = { id: 'menu-1', categories: [] } as unknown as Menu;
      service.prepareBiteFromMenuItem(menu);
      expect(storeMock.cacheBite).toHaveBeenCalledWith(menu);
    });
  });
});
