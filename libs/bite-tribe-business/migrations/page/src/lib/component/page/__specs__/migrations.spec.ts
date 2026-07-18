import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Migrations } from '../migrations';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite } from 'model';
import * as utilsModule from 'utils';
import { addNecessaryIcons } from 'utils';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

addNecessaryIcons();

jest.mock('@capacitor-firebase/storage');
jest.mock('@capacitor-firebase/firestore');

jest.mock('utils');

const actualUtils = jest.requireActual('utils');
jest
  .spyOn(utilsModule, 'dataUrlToBlob')
  .mockImplementation((arg) => actualUtils.dataUrlToBlob(arg));

@Pipe({
  name: 'transloco',
})
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

interface TestableMigrations {
  updateBiteWithImagePath(
    objectPath: string,
    bite: Bite,
    docId: string,
  ): Promise<void>;
}

describe('Migrations', () => {
  let component: Migrations;
  let fixture: ComponentFixture<Migrations>;
  let updateDocumentSpy: jest.SpyInstance;
  let compRef: ComponentRef<Migrations>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    })
      .overrideComponent(Migrations, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

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

  describe('bite address backfill', () => {
    it('should return Bites that still need address enrichment', () => {
      const bites = [
        { id: 'resolved', addressStatus: 'resolved' },
        { id: 'failed', addressStatus: 'failed' },
        { id: 'pending', addressStatus: 'pending' },
        { id: 'missing-status' },
      ] as Bite[];

      compRef.setInput('addressBackfillBites', bites);

      expect(component.bitesNeedingAddressBackfill()).toEqual([
        bites[1],
        bites[2],
        bites[3],
      ]);
    });

    it('should ignore store Bites when rendering address backfill rows', () => {
      const storeBite = {
        id: 'store-bite',
        name: 'Store Bite',
        addressStatus: 'pending',
        geohash: 'u0m',
      } as Bite;
      const historicalBite = {
        id: 'historical-bite',
        name: 'Historical Bite',
        addressStatus: 'failed',
      } as Bite;

      compRef.setInput('bites', [storeBite]);
      compRef.setInput('addressBackfillBites', [historicalBite]);
      fixture.detectChanges();

      const textContent =
        fixture.nativeElement.querySelector('.migration-table').textContent;

      expect(textContent).toContain('Historical Bite');
      expect(textContent).not.toContain('Store Bite');
    });

    it('should render the address backfill action and emit when triggered', () => {
      const emitSpy = jest.spyOn(component.backfillBiteAddress, 'emit');
      const bite = {
        id: 'pending',
        name: 'Pizza',
        addressStatus: 'pending',
        position: { latitude: 40.1, longitude: 14.2 },
      } as Bite;

      compRef.setInput('addressBackfillBites', [bite]);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      const backfillButton = Array.from(
        fixture.nativeElement.querySelectorAll('ion-button'),
      ).find((button) =>
        (button as HTMLElement).textContent?.includes('backfill-bite-address'),
      ) as HTMLIonButtonElement | undefined;

      expect(textContent).toContain('bite-address-backfill');
      expect(textContent).toContain('Pizza');
      expect(textContent).toContain('pending');
      expect(textContent).toContain('40.1, 14.2');
      expect(backfillButton?.disabled).toBe(false);

      component.backfillAddress(bite);

      expect(emitSpy).toHaveBeenCalledWith(bite);
    });
  });

  describe('restaurant clustering migration', () => {
    it('should render eligible Bites with review context and enabled action', () => {
      const eligibleBite = {
        id: 'bite-1',
        name: 'Arepa',
        image: '',
        imagePath: 'image-path',
        place: 'Cafe Central',
        position: { latitude: 46.948, longitude: 7.4474 },
        geohash: 'u0m',
      } as Bite;

      compRef.setInput('restaurantClusteringEligibleBites', [eligibleBite]);
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      const clusterButton = Array.from(
        fixture.nativeElement.querySelectorAll('ion-button'),
      ).find((button) =>
        (button as HTMLElement).textContent?.includes(
          'cluster-restaurant-candidate',
        ),
      ) as HTMLIonButtonElement | undefined;

      expect(textContent).toContain('restaurant-clustering-migration');
      expect(textContent).toContain('Arepa');
      expect(textContent).toContain('Cafe Central');
      expect(textContent).toContain('46.948, 7.4474');
      expect(textContent).toContain('restaurant-clustering-state-ready');
      expect(textContent).toContain('cluster-restaurant-candidate');
      expect(clusterButton?.disabled).toBe(false);
    });

    it('should show missing geohash as the current clustering state', () => {
      expect(component.restaurantClusteringState({ geohash: '' } as Bite)).toBe(
        'restaurant-clustering-state-missing-geohash',
      );
    });

    it('should emit the selected Bite when clustering is triggered', () => {
      const eligibleBite = {
        id: 'bite-1',
        place: 'Cafe Central',
        position: { latitude: 46.948, longitude: 7.4474 },
      } as Bite;
      const emitSpy = jest.spyOn(component.clusterRestaurantCandidate, 'emit');

      component.clusterCandidate(eligibleBite);

      expect(emitSpy).toHaveBeenCalledWith(eligibleBite);
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

        const uploadFileCallback = firebaseStorageUploadFile.mock.calls[0][1];
        expect(uploadFileCallback).toBeInstanceOf(Function);

        const updateBiteWithImagePathSpy = jest
          .spyOn(
            component as unknown as TestableMigrations,
            'updateBiteWithImagePath',
          )
          .mockResolvedValue();

        await uploadFileCallback({ completed: true, progress: 1 }, undefined);

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

        const uploadFileCallback = firebaseStorageUploadFile.mock.calls[0][1];
        expect(uploadFileCallback).toBeInstanceOf(Function);

        await uploadFileCallback(null, 'Upload error');

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
      const testableComponent = component as unknown as TestableMigrations;
      jest.spyOn(testableComponent, 'updateBiteWithImagePath');

      jest
        .spyOn(utilsModule, 'getDownloadUrlFromFirebaseStorage')
        .mockResolvedValue('download-url');

      await testableComponent.updateBiteWithImagePath(
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
