import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeStartComponent } from '../bite-tribe-start.component';
import { provideRouter } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setCurrentScreen: jest.fn(),
  },
}));

describe('BiteTribeStartComponent', () => {
  let component: BiteTribeStartComponent;
  let fixture: ComponentFixture<BiteTribeStartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(BiteTribeStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call FirebaseAnalytics.setCurrentScreen on ionViewDidEnter', () => {
    const spy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    component.ionViewDidEnter();
    expect(spy).toHaveBeenCalledWith({
      screenName: 'Start',
    });
  });
});
