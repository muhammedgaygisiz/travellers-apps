import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { HomeService } from '../home.service';
import { RestaurantBitesContainer } from '../restaurant-bites.container';

describe('RestaurantBitesContainer', () => {
  let component: RestaurantBitesContainer;
  let fixture: ComponentFixture<RestaurantBitesContainer>;
  let mockHomeService: jasmine.SpyObj<HomeService>;

  beforeEach(async () => {
    const homeServiceSpy = jasmine.createSpyObj(
      'HomeService',
      [
        'logout',
        'likeButtonClicked',
        'biteClicked',
        'restaurantClicked',
        'onAddButtonClicked',
        'onGotoSettingsClick',
        'onGotoMyProfileClick',
        'onGotoMyBitesClick',
        'onGotoEditClick',
        'onGotoAboutClick',
        'onDeleteBiteClick',
        'openMapView',
        'restaurantBitesSortingChange',
        'refresh',
        'closeGpsError',
      ],
      {
        restaurantBites: jasmine.createSpy().and.returnValue([]),
        userId: jasmine.createSpy().and.returnValue('test-user'),
        isReloading: jasmine.createSpy().and.returnValue(false),
        hasErrorLoadingGpsPosition: jasmine.createSpy().and.returnValue(false),
        restaurantBitesSorting: jasmine
          .createSpy()
          .and.returnValue('createdAt'),
      },
    );

    await TestBed.configureTestingModule({
      imports: [RestaurantBitesContainer],
      providers: [{ provide: HomeService, useValue: homeServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantBitesContainer);
    component = fixture.componentInstance;
    mockHomeService = TestBed.inject(
      HomeService,
    ) as jasmine.SpyObj<HomeService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call FirebaseAnalytics.setCurrentScreen on ionViewDidEnter', () => {
    spyOn(FirebaseAnalytics, 'setCurrentScreen');

    component.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Restaurant Bites',
    });
  });
});
