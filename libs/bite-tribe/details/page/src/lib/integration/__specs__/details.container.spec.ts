import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsContainer } from '../details.container';
import { DetailsService } from '../details.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe(DetailsContainer.name, () => {
  let component: DetailsContainer;
  let fixture: ComponentFixture<DetailsContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: DetailsService,
          useValue: {
            bite: {
              value: signal(undefined),
              reload: jest.fn(),
            },
            reviews: signal(undefined),
            currentPosition: {
              value: signal(undefined),
            },
            bucketlists: signal(undefined),
            userId: signal(undefined),
            biteCreator: {
              value: signal(undefined),
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            isAuthenticated: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DetailsContainer);
    component = fixture.componentInstance;
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
        screenName: 'Bite Details',
      });
    });
  });
});
