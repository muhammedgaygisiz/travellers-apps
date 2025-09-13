import { TestBed } from '@angular/core/testing';
import { BiteService } from '../bite.service';
import { NavController } from '@ionic/angular';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import SpyInstance = jest.SpyInstance;

const Mock = {
  navigateBack: jest.fn(),
  setEditedImage: jest.fn(),
  submitEditedBite: jest.fn(),
  submitNewBite: jest.fn(),
  navigateForward: jest.fn(),
  submitBite: jest.fn(),
};

describe('BiteService', () => {
  let service: BiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteDataAccessService, useValue: Mock },
        { provide: NavController, useValue: Mock },
      ],
    }).compileComponents();

    service = TestBed.inject<BiteService>(BiteService);
  });

  describe('startCropImage', () => {
    let startCropImageSpy: SpyInstance;

    beforeEach(() => {
      startCropImageSpy = jest.spyOn(service, 'startCropImage');
    });

    it('should setup crop-image', () => {
      const mockImage = 'mockImage.jpg';
      service.startCropImage(mockImage);
      expect(startCropImageSpy).toHaveBeenCalledWith(mockImage);
    });

    it('should navigate to image-crop', () => {
      const mockImage = 'mockImage.jpg';
      service.startCropImage(mockImage);
      expect(Mock.navigateForward).toHaveBeenCalledWith(['image-crop']);
    });

    it('should set originalImage signal', () => {
      const mockImage = 'mockImage.jpg';
      service.startCropImage(mockImage);
      expect(service.originalImage()).toBe(mockImage);
    });

    it('should not set originalImage signal if image is null', () => {
      service.startCropImage(null);
      expect(service.originalImage()).toBe('');
    });
  });

  describe('submitNewBite', () => {
    it('should submit bite without id', () => {
      const newBite = { id: '123', name: 'Test Bite' };
      service.submitNewBite(newBite);

      expect(Mock.submitBite).toHaveBeenCalledWith({ name: 'Test Bite' });
    });

    it('should call navigateBack to home', () => {
      const newBite = { id: '123', name: 'Test Bite' };
      service.submitNewBite(newBite);

      expect(Mock.navigateBack).toHaveBeenCalledWith(['home']);
    });
  });
});
