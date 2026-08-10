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

      // Addressed by test id rather than by being the first `.migration-table`
      // on the page, which is not a property of this table.
      const textContent = fixture.nativeElement.querySelector(
        '[data-testid="bite-address-backfill-table"]',
      ).textContent;

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

  describe('new version notification', () => {
    const notificationButton = (
      key: string,
    ): HTMLIonButtonElement | undefined =>
      Array.from(fixture.nativeElement.querySelectorAll('ion-button')).find(
        (button) => (button as HTMLElement).textContent?.includes(key),
      ) as HTMLIonButtonElement | undefined;

    it('should offer one button per store', () => {
      const textContent = fixture.nativeElement.textContent;

      expect(textContent).toContain('new-version-notification');
      expect(textContent).toContain('notify-ios-users');
      expect(textContent).toContain('notify-android-users');
      expect(notificationButton('notify-ios-users')?.disabled).toBe(false);
      expect(notificationButton('notify-android-users')?.disabled).toBe(false);
    });

    it('should emit the store the announcement is addressed to', () => {
      const emitSpy = jest.spyOn(component.sendNewVersionNotification, 'emit');

      component.notifyNewVersion('ios');
      component.notifyNewVersion('android');

      expect(emitSpy).toHaveBeenNthCalledWith(1, 'ios');
      expect(emitSpy).toHaveBeenNthCalledWith(2, 'android');
    });

    it('should say nothing before an announcement was triggered', () => {
      expect(component.newVersionNotificationStatusKey()).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(
        'new-version-notification-sent',
      );
    });

    it('should block both buttons while a send is in flight', () => {
      // Pressing again mid-send would announce the same release twice.
      compRef.setInput('newVersionNotification', {
        platform: 'ios',
        status: 'sending',
      });
      fixture.detectChanges();

      expect(component.isSendingNewVersionNotification()).toBe(true);
      expect(notificationButton('notify-ios-users')?.disabled).toBe(true);
      expect(notificationButton('notify-android-users')?.disabled).toBe(true);
    });

    it('should report how far a finished announcement reached', () => {
      compRef.setInput('newVersionNotification', {
        platform: 'android',
        status: 'sent',
        result: { platform: 'android', tokenCount: 12, userCount: 30 },
      });
      fixture.detectChanges();

      expect(component.newVersionNotificationStatusKey()).toBe(
        'new-version-notification-sent',
      );
      expect(component.newVersionNotificationStatusParams()).toEqual({
        platform: 'android',
        tokenCount: 12,
        userCount: 30,
      });
      expect(component.isSendingNewVersionNotification()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain(
        'new-version-notification-sent',
      );
    });

    it('should report a failed announcement instead of staying silent', () => {
      compRef.setInput('newVersionNotification', {
        platform: 'ios',
        status: 'failed',
      });
      fixture.detectChanges();

      expect(component.newVersionNotificationStatusKey()).toBe(
        'new-version-notification-failed',
      );
      expect(component.newVersionNotificationStatusParams()).toEqual({
        platform: 'ios',
        tokenCount: 0,
        userCount: 0,
      });
      expect(fixture.nativeElement.textContent).toContain(
        'new-version-notification-failed',
      );
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

  describe('collection migrations', () => {
    const row = (name: string): HTMLElement =>
      fixture.nativeElement.querySelector(
        `[data-testid="collection-migration-${name}"]`,
      );

    const runButton = (name: string): HTMLElement =>
      row(name).querySelector('[data-testid="run-migration"]') as HTMLElement;

    it('lists every collection-wide migration', () => {
      expect(row('review-timestamps')).toBeTruthy();
      expect(row('display-name-claims')).toBeTruthy();
    });

    it('reports a migration that has not been run in this session', () => {
      expect(row('review-timestamps').textContent).toContain(
        'migration-not-run',
      );
    });

    it('asks for the migration the button belongs to', () => {
      const requested: string[] = [];
      component.runCollectionMigration.subscribe((name) =>
        requested.push(name),
      );

      runButton('display-name-claims').click();

      expect(requested).toEqual(['display-name-claims']);
    });

    it('holds the button of a run that is still going', () => {
      compRef.setInput('collectionMigrations', {
        'review-timestamps': { status: 'running' },
      });
      compRef.changeDetectorRef.detectChanges();

      expect(runButton('review-timestamps')).toHaveProperty('disabled', true);
      expect(
        row('review-timestamps').querySelector(
          '[data-testid="migration-running"]',
        ),
      ).toBeTruthy();
    });

    it('leaves the other migrations startable while one runs', () => {
      compRef.setInput('collectionMigrations', {
        'review-timestamps': { status: 'running' },
      });
      compRef.changeDetectorRef.detectChanges();

      expect(runButton('display-name-claims')).toHaveProperty(
        'disabled',
        false,
      );
    });

    it('renders whatever counts the finished run reported', () => {
      // The two migrations report different fields, and the row is not written
      // per migration, so it renders what it is given.
      compRef.setInput('collectionMigrations', {
        'review-timestamps': {
          status: 'done',
          result: { processed: 12, filled: 4, skipped: 7, unresolvable: 1 },
        },
      });
      compRef.changeDetectorRef.detectChanges();

      const counts = row('review-timestamps').querySelector(
        '[data-testid="migration-counts"]',
      );

      expect(counts?.textContent).toContain('migration-count-processed');
      expect(counts?.textContent).toContain('12');
      expect(counts?.textContent).toContain('migration-count-unresolvable');
      expect(counts?.textContent).toContain('1');
    });

    it('says so when a run failed rather than showing nothing', () => {
      compRef.setInput('collectionMigrations', {
        'display-name-claims': { status: 'failed' },
      });
      compRef.changeDetectorRef.detectChanges();

      expect(
        row('display-name-claims').querySelector(
          '[data-testid="migration-failed"]',
        ),
      ).toBeTruthy();
      expect(runButton('display-name-claims')).toHaveProperty(
        'disabled',
        false,
      );
    });
  });
});
