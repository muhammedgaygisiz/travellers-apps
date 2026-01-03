import { beforeEach, describe, expect, it } from 'vitest';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BiteService } from '../bite.service';
import { NavController } from '@ionic/angular';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { vi } from 'vitest';

const Mock = {
  navigateBack: vi.fn(),
  setEditedImage: vi.fn(),
  submitEditedBite: vi.fn(),
  submitNewBite: vi.fn(),
  navigateForward: vi.fn(),
  submitBite: vi.fn(),
  back: vi.fn(),
};

vi.mock('localization');

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

      expect(Mock.submitBite).toHaveBeenCalledWith({ name: 'Test Bite' });
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

      expect(Mock.submitBite).toHaveBeenCalledWith(editedBite);
    });

    it('should navigate back to previous page', () => {
      const editedBite = { id: '123', name: 'Edited Bite' };
      service.submitEditedBite(editedBite);

      expect(Mock.back).toHaveBeenCalled();
    });
  });
});
