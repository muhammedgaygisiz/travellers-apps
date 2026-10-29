import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BiteService } from '../bite.service';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { CelebrationService } from 'celebration';

const Mock = {
  navigateBack: jest.fn(),
  setEditedImage: jest.fn(),
  submitEditedBite: jest.fn(),
  submitNewBite: jest.fn(),
  navigateForward: jest.fn(),
  submitBite: jest.fn(),
  back: jest.fn(),
  setEditingBite: jest.fn(),
  clearCachedBite: jest.fn(),
  cachedBite: jest.fn(),
  biteValue: jest.fn(),
  getCurrencyByPosition: jest.fn(),
  currency: (): string => 'EUR',
  hasOwnBites: jest.fn(),
};

const LoadingMock = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(undefined),
  }),
};

const ToastMock = {
  present: jest.fn().mockResolvedValue(undefined),
};

const TranslocoMock = {
  translate: jest.fn((key: string): string => key),
};

const AnalyticsMock = {
  logEvent: jest.fn(),
};

const CelebrationMock = {
  celebrate: jest.fn().mockResolvedValue(undefined),
};

describe('BiteService', () => {
  let service: BiteService;

  beforeEach(() => {
    jest.clearAllMocks();
    Mock.hasOwnBites.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteDataAccessService, useValue: Mock },
        { provide: NavController, useValue: Mock },
        { provide: Location, useValue: Mock },
        { provide: LoadingController, useValue: LoadingMock },
        { provide: ToastService, useValue: ToastMock },
        { provide: TranslocoService, useValue: TranslocoMock },
        { provide: AnalyticsService, useValue: AnalyticsMock },
        { provide: CelebrationService, useValue: CelebrationMock },
      ],
    }).compileComponents();

    service = TestBed.inject<BiteService>(BiteService);
  });

  describe('submitNewBite', () => {
    it('should submit bite without id', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBite(newBite);

      expect(Mock.submitNewBite).toHaveBeenCalledWith({ name: 'Test Bite' });
    });

    it('should call navigateBack to home', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBite(newBite);

      expect(Mock.navigateBack).toHaveBeenCalledWith(['home']);
    });

    it('should log the bite_created analytics event', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBite(newBite);

      expect(AnalyticsMock.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteCreated,
        { source: 'manual' },
      );
    });

    it('should keep the restaurant and dish of a menu-derived bite', async () => {
      const menuDerivedBite = {
        id: '',
        name: 'Amok Trey',
        place: 'Khmer Kitchen',
        restaurantId: 'restaurant-1',
        price: '5.50',
        currency: 'EUR',
      };

      await service.submitNewBite(menuDerivedBite);

      expect(Mock.submitNewBite).toHaveBeenCalledWith({
        name: 'Amok Trey',
        place: 'Khmer Kitchen',
        restaurantId: 'restaurant-1',
        price: '5.50',
        currency: 'EUR',
      });
    });
  });

  describe('submitNewBiteAndAddAnother', () => {
    it('should submit bite without id', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBiteAndAddAnother(newBite);

      expect(Mock.submitNewBite).toHaveBeenCalledWith({ name: 'Test Bite' });
    });

    it('should stay on the create form', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBiteAndAddAnother(newBite);

      expect(Mock.navigateBack).not.toHaveBeenCalled();
    });

    it('should confirm the creation with a toast', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBiteAndAddAnother(newBite);

      expect(ToastMock.present).toHaveBeenCalledWith({
        messageKey: 'bite-created-successfully',
        outcome: 'success',
      });
    });

    it('should log the bite_created analytics event', async () => {
      const newBite = { id: '123', name: 'Test Bite' };
      await service.submitNewBiteAndAddAnother(newBite);

      expect(AnalyticsMock.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteCreated,
        { source: 'manual' },
      );
    });
  });

  describe('the first Bite', () => {
    const newBite = { id: '', name: 'Test Bite' };

    it.each([
      ['submitNewBite', 'submitNewBite'],
      ['submitNewBiteAndAddAnother', 'submitNewBiteAndAddAnother'],
    ] as const)(
      'celebrates in place of the ordinary toast through %s',
      async (_, submit) => {
        Mock.hasOwnBites.mockResolvedValue(false);

        await service[submit](newBite);

        expect(CelebrationMock.celebrate).toHaveBeenCalledTimes(1);
        expect(CelebrationMock.celebrate).toHaveBeenCalledWith('first-bite');
        expect(ToastMock.present).not.toHaveBeenCalled();
      },
    );

    it('asks before the create, which would count as a Bite', async () => {
      Mock.hasOwnBites.mockResolvedValue(false);
      Mock.submitNewBite.mockImplementationOnce(async () => {
        Mock.hasOwnBites.mockResolvedValue(true);
      });

      await service.submitNewBite(newBite);

      expect(CelebrationMock.celebrate).toHaveBeenCalledWith('first-bite');
    });

    it('shows the ordinary toast and no confetti for a later Bite', async () => {
      await service.submitNewBite(newBite);

      expect(CelebrationMock.celebrate).not.toHaveBeenCalled();
      expect(ToastMock.present).toHaveBeenCalledWith({
        messageKey: 'bite-created-successfully',
        outcome: 'success',
      });
    });

    it('does not celebrate when it cannot tell', async () => {
      Mock.hasOwnBites.mockResolvedValue(undefined);

      await service.submitNewBite(newBite);

      expect(CelebrationMock.celebrate).not.toHaveBeenCalled();
      expect(ToastMock.present).toHaveBeenCalledTimes(1);
    });

    it('celebrates nothing when the create fails', async () => {
      Mock.hasOwnBites.mockResolvedValue(false);
      Mock.submitNewBite.mockRejectedValueOnce(new Error('offline'));

      await expect(service.submitNewBite(newBite)).rejects.toThrow('offline');

      expect(CelebrationMock.celebrate).not.toHaveBeenCalled();
      expect(ToastMock.present).not.toHaveBeenCalled();
    });
  });

  describe('submitEditedBite', () => {
    it('should submit edited bite', () => {
      const editedBite = { id: '123', name: 'Edited Bite' };
      service.submitEditedBite(editedBite);

      expect(Mock.submitEditedBite).toHaveBeenCalledWith(editedBite);
    });

    it('should navigate back to previous page', () => {
      const editedBite = { id: '123', name: 'Edited Bite' };
      service.submitEditedBite(editedBite);

      expect(Mock.back).toHaveBeenCalled();
    });

    it('clears the old city and country when the edit moves the Bite', () => {
      Mock.biteValue.mockReturnValue({
        id: '123',
        position: { latitude: 49.0665, longitude: 18.9219 },
        city: 'Martin',
        countryCode: 'SK',
      });
      const editedBite = {
        id: '123',
        place: 'Karak Budapest Restaurant',
        position: { latitude: 47.4979, longitude: 19.0402 },
      };

      service.submitEditedBite(editedBite);

      expect(Mock.submitEditedBite).toHaveBeenCalledWith({
        ...editedBite,
        city: null,
        region: null,
        country: null,
        countryCode: null,
        formatted: null,
        addressStatus: 'pending',
      });
    });

    it('leaves the address alone when the edit keeps the position', () => {
      const position = { latitude: 49.0665, longitude: 18.9219 };
      Mock.biteValue.mockReturnValue({ id: '123', position, city: 'Martin' });
      const editedBite = {
        id: '123',
        name: 'Goulash',
        position: { ...position },
      };

      service.submitEditedBite(editedBite);

      expect(Mock.submitEditedBite).toHaveBeenCalledWith(editedBite);
    });
  });

  describe('setEditingBite', () => {
    it('should set editing bite', () => {
      const bite = { id: '123', name: 'Editing Bite' };
      service.setEditingBite(bite);

      expect(Mock.setEditingBite).toHaveBeenCalledWith(bite);
    });
  });

  describe('clearCachedBite', () => {
    it('should clear the cached bite', () => {
      service.clearCachedBite();

      expect(Mock.clearCachedBite).toHaveBeenCalled();
    });
  });

  describe('determineCurrencyForPosition', () => {
    it('prefills the currency resolved for the position', async () => {
      Mock.getCurrencyByPosition.mockResolvedValue('KHR');

      await service.determineCurrencyForPosition({
        latitude: 11.55,
        longitude: 104.91,
      });

      expect(service.effectiveCurrency()).toBe('KHR');
    });

    it('falls back to the preferred currency when none is resolved', async () => {
      Mock.getCurrencyByPosition.mockResolvedValue(undefined);

      await service.determineCurrencyForPosition({
        latitude: 1,
        longitude: 2,
      });

      expect(service.effectiveCurrency()).toBe('EUR');
    });

    it('does not look up the same position twice', async () => {
      Mock.getCurrencyByPosition.mockResolvedValue('USD');

      await service.determineCurrencyForPosition({ latitude: 1, longitude: 2 });
      await service.determineCurrencyForPosition({ latitude: 1, longitude: 2 });

      expect(Mock.getCurrencyByPosition).toHaveBeenCalledTimes(1);
    });

    it('ignores an undefined position', async () => {
      await service.determineCurrencyForPosition(undefined);

      expect(Mock.getCurrencyByPosition).not.toHaveBeenCalled();
    });
  });

  /**
   * The links a prefilled draft carries, which the form cannot (issue #1114).
   *
   * `visitId`, `menuItemId` and `variantId` are not form controls - a guest can
   * neither see nor change them - so before this they were dropped between the
   * draft and Firestore, and the Bites written from a meal or a menu row
   * reached the collection with no link to either.
   */
  describe('the draft a Bite was started from', () => {
    const draft = {
      restaurantId: 'restaurant-1',
      visitId: 'visit-1',
      menuItemId: 'item-margherita',
      variantId: 'variant-large',
    };

    it('carries the meal and the dish onto the document', async () => {
      Mock.cachedBite.mockReturnValue(draft);

      await service.submitNewBite({
        id: '123',
        name: 'Margherita',
        restaurantId: 'restaurant-1',
      });

      expect(Mock.submitNewBite).toHaveBeenCalledWith({
        name: 'Margherita',
        restaurantId: 'restaurant-1',
        visitId: 'visit-1',
        menuItemId: 'item-margherita',
        variantId: 'variant-large',
      });
    });

    it('reports a Bite made from a meal as coming from one', async () => {
      Mock.cachedBite.mockReturnValue(draft);

      await service.submitNewBite({
        id: '123',
        name: 'Margherita',
        restaurantId: 'restaurant-1',
      });

      expect(AnalyticsMock.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteCreated,
        { source: 'visit' },
      );
    });

    /**
     * The guard that matters. Picking a different restaurant clears
     * `restaurantId` on the form, and a menu item id carried past that point
     * would file a Bite under a restaurant whose menu never had that dish.
     */
    it('drops the link once the Bite is about another restaurant', async () => {
      Mock.cachedBite.mockReturnValue(draft);

      await service.submitNewBite({
        id: '123',
        name: 'Margherita',
        restaurantId: 'restaurant-2',
      });

      expect(Mock.submitNewBite).toHaveBeenCalledWith({
        name: 'Margherita',
        restaurantId: 'restaurant-2',
      });
    });

    it('leaves a hand-written Bite alone', async () => {
      Mock.cachedBite.mockReturnValue(undefined);

      await service.submitNewBite({ id: '123', name: 'Test Bite' });

      expect(Mock.submitNewBite).toHaveBeenCalledWith({ name: 'Test Bite' });
    });
  });
});
