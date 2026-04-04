import { MarketPlaceContainerComponent } from '../market-place-container.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

jest.mock('@capacitor-firebase/analytics');

describe(MarketPlaceContainerComponent.name, () => {
  let component: MarketPlaceContainerComponent;
  let fixture: ComponentFixture<MarketPlaceContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketPlaceContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to Market Place', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');

      component.ionViewDidEnter();

      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'Market Place',
      });
    });
  });
});
