import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartComponent } from '../start.component';
import { provideRouter } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { vi } from 'vitest';

vi.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setCurrentScreen: vi.fn(),
  },
}));

describe('BiteTribeStartComponent', () => {
  let component: StartComponent;
  let fixture: ComponentFixture<StartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(StartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call FirebaseAnalytics.setCurrentScreen on ionViewDidEnter', () => {
    const spy = vi.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    component.ionViewDidEnter();
    expect(spy).toHaveBeenCalledWith({
      screenName: 'Start',
    });
  });
});
