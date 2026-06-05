import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BiteService } from '../bite.service';
import { NavController } from '@ionic/angular';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';

const Mock = {
  navigateBack: jest.fn(),
  setEditedImage: jest.fn(),
  submitEditedBite: jest.fn(),
  submitNewBite: jest.fn(),
  navigateForward: jest.fn(),
  submitBite: jest.fn(),
  back: jest.fn(),
  setEditingBite: jest.fn(),
};

describe('BiteService', () => {
  let service: BiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteDataAccessService, useValue: Mock },
        { provide: NavController, useValue: Mock },
        { provide: Location, useValue: Mock },
      ],
    }).compileComponents();

    service = TestBed.inject<BiteService>(BiteService);
  });

  describe('submitNewBite', () => {
    it('should submit bite without id', () => {
      const newBite = { id: '123', name: 'Test Bite' };
      service.submitNewBite(newBite);

      expect(Mock.submitNewBite).toHaveBeenCalledWith({ name: 'Test Bite' });
    });

    it('should call navigateBack to home', () => {
      const newBite = { id: '123', name: 'Test Bite' };
      service.submitNewBite(newBite);

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
});
