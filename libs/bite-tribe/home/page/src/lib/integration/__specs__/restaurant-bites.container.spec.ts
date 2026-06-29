/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { HomeService } from '../home.service';
import { RestaurantBitesContainer } from '../restaurant-bites.container';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'utils';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('RestaurantBitesContainer', () => {
  let component: RestaurantBitesContainer;
  let fixture: ComponentFixture<RestaurantBitesContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: TranslocoService, useValue: MockTranslocoService },
        {
          provide: HomeService,
          useValue: {
            likeButtonClicked: (): void => {},
            biteClicked: (): void => {},
            onAddButtonClicked: (): void => {},
            onGotoSettingsClick: (): void => {},
            onGotoMyProfileClick: (): void => {},
            onGotoMyBitesClick: (): void => {},
            onGotoEditClick: (): void => {},
            onGotoAboutClick: (): void => {},
            onDeleteBiteClick: (): void => {},
            openMapView: (): void => {},
            restaurantBitesSortingChange: (): void => {},
            refresh: (): void => {},
            closeGpsError: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RestaurantBitesContainer);
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

    it('should set current screen to "Restaurant Bites"', () => {
      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'Restaurant Bites',
      });
    });
  });
});
