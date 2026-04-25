import { TestBed } from '@angular/core/testing';
import { MenuDataAccessService } from '../menu-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Menu } from 'model';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe(MenuDataAccessService.name, () => {
  let service: MenuDataAccessService;
  let apiMock: { saveMenu: jest.Mock };
  let storeMock: {
    bite$: any;
    restaurant$: any;
    menu$: any;
    cacheBite: jest.Mock;
  };

  beforeEach(() => {
    apiMock = { saveMenu: jest.fn() };
    storeMock = {
      bite$: of(),
      restaurant$: of(),
      menu$: of(),
      cacheBite: jest.fn(),
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
});
