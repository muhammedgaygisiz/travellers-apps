import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BucketlistsContainerComponent } from '../bucketlists.container';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BucketlistsService } from '../bucketlists.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

describe('BucketlistsContainerComponent', () => {
  let component: BucketlistsContainerComponent;
  let fixture: ComponentFixture<BucketlistsContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BucketlistsService,
          useValue: {
            bucketlists: signal(undefined),
            sorting: signal(undefined),
            gotoBucketlistDetails: jest.fn(),
            createAndSaveToBucketList: jest.fn(),
            sortingChange: jest.fn(),
            gotoEditBucketlist: jest.fn(),
            deleteBucketlist: jest.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BucketlistsContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ionViewDidEnter', () => {
    let setCurrentScreenSpy: jest.SpyInstance;

    beforeEach(() => {
      setCurrentScreenSpy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    });

    it('should call FirebaseAnalytics.setCurrentScreen with correct screen name', () => {
      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'My Bucketlists',
      });
    });
  });
});
