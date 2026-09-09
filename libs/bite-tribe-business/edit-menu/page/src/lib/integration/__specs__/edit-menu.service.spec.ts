import { TestBed } from '@angular/core/testing';
import { EditMenuService } from '../edit-menu.service';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { Menu } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe/menu-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditMenuService', () => {
  let service: EditMenuService;
  let dataAccessMock: jest.Mocked<MenuDataAccessService>;
  let navControllerMock: { back: jest.Mock };
  let toastMock: { present: jest.Mock };

  beforeEach(() => {
    dataAccessMock = {
      restaurant: signal(undefined),
      menu: signal(undefined),
      saveMenu: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MenuDataAccessService>;

    navControllerMock = { back: jest.fn() };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        EditMenuService,
        { provide: MenuDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(EditMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveMenu', () => {
    it('should save the menu via data access and navigate back', async () => {
      const menu = { id: 'menu1', categories: [] } as unknown as Menu;

      await service.saveMenu(menu);

      expect(dataAccessMock.saveMenu).toHaveBeenCalledWith(menu);
      expect(navControllerMock.back).toHaveBeenCalled();
      expect(toastMock.present).not.toHaveBeenCalled();
    });

    /**
     * The ownership-scoped rules refuse a menu save from an account that does
     * not hold the restaurant (issue #1078), and the business dashboard still
     * lists every restaurant until issue #1079, so this is reachable. Leaving
     * the editor on a refusal would report success for a change that was thrown
     * away.
     */
    it('should keep the editor open and report a refused save', async () => {
      const menu = { id: 'menu1', categories: [] } as unknown as Menu;
      dataAccessMock.saveMenu = jest
        .fn()
        .mockRejectedValue(new Error('permission-denied'));

      await service.saveMenu(menu);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
      expect(navControllerMock.back).not.toHaveBeenCalled();
    });
  });
});
