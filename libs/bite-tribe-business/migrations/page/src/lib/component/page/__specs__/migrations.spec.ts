import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Migrations } from '../migrations';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite } from 'model';
import * as utilsModule from 'utils';
import { addNecessaryIcons } from 'utils';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ComponentRef } from '@angular/core';

addNecessaryIcons();

jest.mock('localization');
jest.mock('@capacitor-firebase/storage');
jest.mock('@capacitor-firebase/firestore');

jest.mock('utils');

const actualUtils = jest.requireActual('utils');
jest
  .spyOn(utilsModule, 'dataUrlToBlob')
  .mockImplementation((arg) => actualUtils.dataUrlToBlob(arg));

describe('Migrations', () => {
  let component: Migrations;
  let fixture: ComponentFixture<Migrations>;
  let updateDocumentSpy: jest.SpyInstance;
  let compRef: ComponentRef<Migrations>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    }).compileComponents();

    updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');

    fixture = TestBed.createComponent(Migrations);
    compRef = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    updateDocumentSpy.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('bitesNeedingMigration', () => {
    it('should return bites needing migration', () => {
      const bites = [
        { id: '1', imagePath: 'path', image: '' },
        { id: '2', imagePath: '', image: 'data:image/png;base64,...' },
        { id: '3', imagePath: undefined, image: 'data:image/png;base64,...' },
        { id: '4', imagePath: '', image: '' },
      ] as Bite[];

      compRef.setInput('bites', bites);

      expect(component.bitesNeedingMigration()).toEqual([
        bites[1],
        bites[2],
        bites[3],
      ]);
    });
  });

  describe('bitesWithoutGeohash', () => {
    it('should return bites without geohash', () => {
      const bites = [
        { id: '1', geohash: 'abc' },
        { id: '2', geohash: '' },
        { id: '3', geohash: undefined },
        { id: '4' },
      ] as Bite[];

      compRef.setInput('bites', bites);

      expect(component.bitesWithoutGeohash()).toEqual([
        bites[1],
        bites[2],
        bites[3],
      ]);
    });
  });

  describe('migrate', () => {
    describe('given a old bite', () => {
      const oldBite = {
        imagePath: undefined,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        id: 'bite-id',
        name: 'Bite Name',
      } as Bite;

      it('should upload the image to firebase and call updateBiteWithImagePath on success', async () => {
        const firebaseStorageUploadFile = jest.spyOn(
          FirebaseStorage,
          'uploadFile',
        );

        await component.migrate(oldBite);

        expect(firebaseStorageUploadFile).toHaveBeenCalled();

        const uploadFileCallback = firebaseStorageUploadFile.mock
          .calls[0][1] as any;
        expect(uploadFileCallback).toBeInstanceOf(Function);

        const updateBiteWithImagePathSpy = jest
          .spyOn<any, any>(component, 'updateBiteWithImagePath')
          .mockImplementation();

        await uploadFileCallback({ completed: true }, undefined);

        expect(updateBiteWithImagePathSpy).toHaveBeenCalledWith(
          expect.stringContaining('images/bites/bite-id/'),
          oldBite,
          'bite-id',
        );
      });

      it('should console.log error if error on uploadFile callback is set', async () => {
        const firebaseStorageUploadFile = jest.spyOn(
          FirebaseStorage,
          'uploadFile',
        );

        const consoleLogSpy = jest.spyOn(console, 'log');

        await component.migrate(oldBite);

        const uploadFileCallback = firebaseStorageUploadFile.mock
          .calls[0][1] as any;
        expect(uploadFileCallback).toBeInstanceOf(Function);

        await uploadFileCallback(undefined, 'Upload error');

        expect(consoleLogSpy).toHaveBeenCalledWith('Upload error');
      });

      it('should console.error log if upload throws an exception', async () => {
        const firebaseStorageUploadFile = jest.spyOn(
          FirebaseStorage,
          'uploadFile',
        );
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        firebaseStorageUploadFile.mockImplementation(() => {
          throw new Error('Upload failed');
        });

        await component.migrate(oldBite);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          new Error('Upload failed'),
        );
      });
    });
  });

  describe('updateBiteWithImagePath', () => {
    it('should update the image path to the image', async () => {
      jest.spyOn<any, any>(component, 'updateBiteWithImagePath');

      jest
        .spyOn(utilsModule, 'getDownloadUrlFromFirebaseStorage')
        .mockResolvedValue('download-url');

      await component['updateBiteWithImagePath'](
        'object/path',
        {} as Bite,
        '1',
      );

      const dataParameter = updateDocumentSpy.mock.calls[0][0].data as Bite;
      expect(dataParameter.image).toEqual('');
      expect(dataParameter.imagePath).toEqual('download-url');
    });
  });

  describe('addGeohash', () => {
    it('should update the bite with a geohash', async () => {
      const bite = {
        position: { latitude: 10, longitude: 20 },
      } as Bite;

      await component.addGeohash(bite);

      const dataParameter = updateDocumentSpy.mock.calls[0][0].data as Bite;
      expect(dataParameter.geohash).toEqual('s3y0zh7w1z');
    });
  });
});
