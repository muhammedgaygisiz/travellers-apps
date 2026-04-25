import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnverifiedRestaurantContainer } from '../unverified-restaurant-container.component';

jest.mock('@capacitor-firebase/analytics');

describe(UnverifiedRestaurantContainer.name, () => {
  let component: UnverifiedRestaurantContainer;
  let fixture: ComponentFixture<UnverifiedRestaurantContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    fixture = TestBed.createComponent(UnverifiedRestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set current screen on ionViewDidEnter', () => {
    const { FirebaseAnalytics } = jest.requireMock(
      '@capacitor-firebase/analytics',
    );
    FirebaseAnalytics.setCurrentScreen = jest.fn();

    component.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Unverified Restaurant',
    });
  });
});
