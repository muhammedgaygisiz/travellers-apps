import { TestBed } from '@angular/core/testing';
import { EditMenuService } from '../edit-menu.service';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { Menu } from 'model';

jest.mock('bite-tribe/menu-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditMenuService', () => {
  let service: EditMenuService;
  let dataAccessMock: jest.Mocked<MenuDataAccessService>;
  let navControllerMock: { back: jest.Mock };

  beforeEach(() => {
    dataAccessMock = {
      restaurant: signal(undefined),
      menu: signal(undefined),
      saveMenu: jest.fn(),
    } as unknown as jest.Mocked<MenuDataAccessService>;

    navControllerMock = { back: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        EditMenuService,
        { provide: MenuDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    });

    service = TestBed.inject(EditMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveMenu', () => {
    it('should save the menu via data access and navigate back', () => {
      const menu = { id: 'menu1', categories: [] } as unknown as Menu;

      service.saveMenu(menu);

      expect(dataAccessMock.saveMenu).toHaveBeenCalledWith(menu);
      expect(navControllerMock.back).toHaveBeenCalled();
    });
  });
});
