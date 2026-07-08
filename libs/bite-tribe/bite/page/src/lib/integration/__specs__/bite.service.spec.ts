import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BiteService } from '../bite.service';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { TranslocoService } from '@jsverse/transloco';

const Mock = {
  navigateBack: jest.fn(),
  setEditedImage: jest.fn(),
  submitEditedBite: jest.fn(),
  submitNewBite: jest.fn(),
  navigateForward: jest.fn(),
  submitBite: jest.fn(),
  back: jest.fn(),
  setEditingBite: jest.fn(),
  getCurrencyByPosition: jest.fn(),
  currency: (): string => 'EUR',
};

const LoadingMock = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(undefined),
  }),
};

const ToastMock = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
};

const TranslocoMock = {
  translate: jest.fn((key: string): string => key),
};

describe('BiteService', () => {
  let service: BiteService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteDataAccessService, useValue: Mock },
        { provide: NavController, useValue: Mock },
        { provide: Location, useValue: Mock },
        { provide: LoadingController, useValue: LoadingMock },
        { provide: ToastController, useValue: ToastMock },
        { provide: TranslocoService, useValue: TranslocoMock },
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
  });

  describe('setEditingBite', () => {
    it('should set editing bite', () => {
      const bite = { id: '123', name: 'Editing Bite' };
      service.setEditingBite(bite);

      expect(Mock.setEditingBite).toHaveBeenCalledWith(bite);
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
});
