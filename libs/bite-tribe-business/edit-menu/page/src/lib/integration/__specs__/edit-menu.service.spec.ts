import { TestBed } from '@angular/core/testing';
import { EditMenuService } from '../edit-menu.service';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { LoadingController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { signal } from '@angular/core';
import { Menu } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe/menu-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditMenuService', () => {
  let service: EditMenuService;
  let dataAccessMock: jest.Mocked<MenuDataAccessService>;
  let loading: { present: jest.Mock; dismiss: jest.Mock };
  let loadingControllerMock: { create: jest.Mock };
  let toastMock: { present: jest.Mock };

  beforeEach(() => {
    dataAccessMock = {
      restaurant: signal(undefined),
      menu: signal({ id: 'menu1', categories: [] }),
      saveMenu: jest
        .fn()
        .mockResolvedValue({ status: 'saved', locked: [], pending: [] }),
      retryMenuLoad: jest.fn(),
      markMenuReviewed: jest.fn().mockResolvedValue(undefined),
      confirmMenuAsOwn: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MenuDataAccessService>;

    loading = {
      present: jest.fn().mockResolvedValue(undefined),
      dismiss: jest.fn().mockResolvedValue(true),
    };
    loadingControllerMock = { create: jest.fn().mockResolvedValue(loading) };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        EditMenuService,
        { provide: MenuDataAccessService, useValue: dataAccessMock },
        { provide: LoadingController, useValue: loadingControllerMock },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => key },
        },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(EditMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveMenu', () => {
    const menu = { id: 'menu1', categories: [] } as unknown as Menu;

    /**
     * A save keeps the owner in the editor (issue #1377): a loading overlay
     * while it is written, a toast once it landed, and a re-read of the menu,
     * which is what tells the editor's fields their edit is now stored.
     */
    it('should save under a loading overlay, re-read the menu and confirm it', async () => {
      await service.saveMenu(menu);

      expect(loadingControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'menu-saving' }),
      );
      expect(loading.present).toHaveBeenCalled();
      expect(dataAccessMock.saveMenu).toHaveBeenCalledWith(menu);
      expect(loading.dismiss).toHaveBeenCalled();
      expect(dataAccessMock.retryMenuLoad).toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'menu-saved',
        outcome: 'success',
      });
    });

    it('should present the overlay before writing', async () => {
      dataAccessMock.saveMenu = jest.fn().mockImplementation(() => {
        expect(loading.present).toHaveBeenCalled();
        expect(loading.dismiss).not.toHaveBeenCalled();

        return Promise.resolve({ status: 'saved', locked: [], pending: [] });
      });

      await service.saveMenu(menu);

      expect(dataAccessMock.saveMenu).toHaveBeenCalled();
    });

    /**
     * A label diners removed is locked, and a restaurant at the strike limit
     * waits for an operator before a new label shows (issue #2198). The menu
     * is saved either way, and the toast says which labels were not.
     */
    it.each([
      [
        'a locked label',
        {
          locked: [{ menuItemId: 'm1', label: 'vegan', kind: 'label' }],
          pending: [],
        },
        'menu-saved-dietary-locked',
      ],
      [
        'a label waiting for an operator',
        {
          locked: [],
          pending: [{ menuItemId: 'm1', label: 'vegan', kind: 'label' }],
        },
        'menu-saved-dietary-pending',
      ],
    ])('should say when %s was not published', async (_what, outcome, key) => {
      dataAccessMock.saveMenu = jest
        .fn()
        .mockResolvedValue({ status: 'saved', ...outcome });

      await service.saveMenu(menu);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: key,
        outcome: 'success',
      });
    });

    /**
     * The ownership-scoped rules refuse a menu save from an account that does
     * not hold the restaurant (issue #1078). Nothing stored changed, so the menu
     * is not re-read and the owner's edit stays on screen for another try.
     */
    it('should report a refused save and keep the edit', async () => {
      dataAccessMock.saveMenu = jest
        .fn()
        .mockRejectedValue(new Error('permission-denied'));

      await service.saveMenu(menu);

      expect(loading.dismiss).toHaveBeenCalled();
      expect(dataAccessMock.retryMenuLoad).not.toHaveBeenCalled();
      expect(dataAccessMock.markMenuReviewed).not.toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
      expect(toastMock.present).toHaveBeenCalledTimes(1);
    });

    /** "Menu reviewed" on the dashboard checklist (GitHub issue #2126). */
    it('should mark the menu reviewed once the save lands', async () => {
      await service.saveMenu(menu);

      expect(dataAccessMock.markMenuReviewed).toHaveBeenCalledTimes(1);
    });

    it('should still confirm the save when marking it reviewed is refused', async () => {
      dataAccessMock.markMenuReviewed = jest
        .fn()
        .mockRejectedValue(new Error('permission-denied'));

      await service.saveMenu(menu);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'menu-saved',
        outcome: 'success',
      });
      expect(toastMock.present).toHaveBeenCalledTimes(1);
    });
  });

  /** See GitHub issue #2214. */
  describe('confirmMenuAsOwn', () => {
    it('confirms the menu, re-reads it and says so', async () => {
      await service.confirmMenuAsOwn();

      expect(dataAccessMock.confirmMenuAsOwn).toHaveBeenCalledWith('menu1');
      expect(dataAccessMock.retryMenuLoad).toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'menu-confirmed-as-own',
        outcome: 'success',
      });
    });

    it('reports a refused confirmation and re-reads nothing', async () => {
      dataAccessMock.confirmMenuAsOwn = jest
        .fn()
        .mockRejectedValue(new Error('permission-denied'));

      await service.confirmMenuAsOwn();

      expect(dataAccessMock.retryMenuLoad).not.toHaveBeenCalled();
      expect(dataAccessMock.markMenuReviewed).not.toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });

    /** See GitHub issue #2302. */
    it('ticks "menu reviewed" once the confirmation lands', async () => {
      await service.confirmMenuAsOwn();

      expect(dataAccessMock.markMenuReviewed).toHaveBeenCalledTimes(1);
    });

    it('still says the menu is confirmed when the tick is refused', async () => {
      dataAccessMock.markMenuReviewed = jest
        .fn()
        .mockRejectedValue(new Error('permission-denied'));

      await service.confirmMenuAsOwn();

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'menu-confirmed-as-own',
        outcome: 'success',
      });
    });
  });
});
