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

  describe('setEditedImage', () => {
    let setEditedImageSpy: SpyInstance;

    beforeEach(() => {
      setEditedImageSpy = jest.spyOn(service, 'setEditedImage');
    });

    it('should set edited image', () => {
      const mockImage = 'mockImage.jpg';
      service.setEditedImage(mockImage);
      expect(setEditedImageSpy).toHaveBeenCalledWith(mockImage);
    });
  });
});
