/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { BiteContainer } from '../bite-container.component';

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe('BiteContainer', () => {
  let component: BiteContainer;
  let fixture: ComponentFixture<BiteContainer>;
  let biteServiceMock: BiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BiteService,
          useValue: {
            cachedBite: signal(undefined),
            currency: signal(undefined),
            position: signal(undefined),
            image: signal(undefined),
            submitNewBite: (): void => {},
            setEditingBite: (): jest.Mock => jest.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BiteContainer);
    component = fixture.componentInstance;
    biteServiceMock = TestBed.inject(BiteService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onPlaceChange', () => {
    let setEditingBiteSpy: jest.SpyInstance;

    beforeEach(() => {
      setEditingBiteSpy = jest.spyOn(biteServiceMock, 'setEditingBite');
    });

    it('should call setEditingBite with updated place', () => {
      const testPlace = 'Test Place';
      const existingBite = { id: '123', place: 'Old Place' };
      (biteServiceMock.cachedBite as any) = signal(existingBite);
      component.onPlaceChange(testPlace);

      expect(setEditingBiteSpy).toHaveBeenCalledWith({
        id: '123',
        place: testPlace,
      });
    });
  });
});
