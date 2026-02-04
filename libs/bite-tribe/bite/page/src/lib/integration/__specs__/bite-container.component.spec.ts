/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef, signal, Component } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BiteService } from '../bite.service';
import { BiteContainer } from '../bite-container.component';
import { provideRouter } from '@angular/router';

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

@Component({ template: '' })
class DummyComponent {}

describe('BiteContainer', () => {
  let component: BiteContainer;
  let compRef: ComponentRef<BiteContainer>;
  let fixture: ComponentFixture<BiteContainer>;
  let biteServiceMock: BiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'home', component: DummyComponent }]),
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
            nearbyRestaurants: jest.fn(),
            tagSuggestionsForEditingBite: jest.fn(),
            biteIdWithUploadingImage: jest.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BiteContainer);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
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

  describe('submitNewBite', () => {
    let submitNewBiteSpy: jest.SpyInstance;

    beforeEach(() => {
      submitNewBiteSpy = jest.spyOn(biteServiceMock, 'submitNewBite');
    });

    it('should call submitNewBite on the service', async () => {
      const newBite = { id: '456', place: 'New Place' };
      await component.submitNewBite(newBite as any);

      expect(submitNewBiteSpy).toHaveBeenCalledWith(newBite);
    });

    it('should start loading', async () => {
      await component.submitNewBite({} as any);

      expect(component.loading).not.toBeNull();
    });
  });

  describe('navigationEffect', () => {
    describe('given no biteIdUploadingImage', () => {
      it('should not call navigateBack', () => {
        const navigateBackSpy = jest.spyOn(
          component.navController,
          'navigateBack',
        );

        (biteServiceMock.biteIdWithUploadingImage as any) = signal(undefined);
        compRef.changeDetectorRef.detectChanges();
        expect(navigateBackSpy).not.toHaveBeenCalled();
      });
    });

    describe('given biteIdUploadingImage but no uploadingProgressForBiteImage', () => {
      it('should not call navigateBack', () => {
        const navigateBackSpy = jest.spyOn(
          component.navController,
          'navigateBack',
        );

        (biteServiceMock.biteIdWithUploadingImage as any) = signal('bite123');
        (biteServiceMock.uploadingProgressForBiteImage as any) =
          signal(undefined);
        compRef.changeDetectorRef.detectChanges();
        expect(navigateBackSpy).not.toHaveBeenCalled();
      });
    });

    describe('given biteIdUploadingImage with and uploadingProgressForBiteImage', () => {
      describe('but not matching', () => {
        it('should not call navigateBack', () => {
          const navigateBackSpy = jest.spyOn(
            component.navController,
            'navigateBack',
          );

          (biteServiceMock.biteIdWithUploadingImage as any) = signal('bite123');
          (biteServiceMock.uploadingProgressForBiteImage as any) = signal({
            bite456: { evt: { completed: true } },
          });
          compRef.changeDetectorRef.detectChanges();
          expect(navigateBackSpy).not.toHaveBeenCalled();
        });
      });

      describe('and they match', () => {
        describe('and evt has completed flag', () => {
          it('should call navigateBack', (done) => {
            const navigateBackSpy = jest.spyOn(
              component.navController,
              'navigateBack',
            );

            (biteServiceMock.biteIdWithUploadingImage as any) =
              signal('bite123');
            (biteServiceMock.uploadingProgressForBiteImage as any) = signal({
              bite123: { evt: { completed: true } },
            });
            compRef.changeDetectorRef.detectChanges();

            // Wait for the setTimeout in the effect
            setTimeout(() => {
              expect(navigateBackSpy).toHaveBeenCalledWith(['home']);
              done();
            }, 3100);
          });
        });

        describe('and err is defined', () => {
          it('should present an alert', async () => {
            const alertController = component.alertController;
            const createAlertSpy = jest.spyOn(alertController, 'create');

            (biteServiceMock.biteIdWithUploadingImage as any) =
              signal('bite123');
            (biteServiceMock.uploadingProgressForBiteImage as any) = signal({
              bite123: { err: new Error('Upload failed') },
            });
            compRef.changeDetectorRef.detectChanges();

            expect(createAlertSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                header: 'Image Upload Failed',
                message: expect.stringContaining(
                  'There was an error uploading the image.',
                ),
                backdropDismiss: false,
                buttons: expect.any(Array),
              }),
            );
          });
        });
      });
    });
  });
});
