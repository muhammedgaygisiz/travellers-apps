import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
    exitApp: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('localization');
jest.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: jest.fn(),
  },
}));

describe(AppComponent.name, () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize back button handler', () => {
      const appAddListenerSpy = jest.spyOn(App, 'addListener');

      component['initBackbuttonHandler']();

      expect(appAddListenerSpy).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });
  });

  describe('ngOnInit', () => {
    it('should call platform.ready and SplashScreen.hide', async () => {
      const platformReadySpy = jest
        .spyOn(component.platform, 'ready')
        .mockResolvedValue('');
      const splashScreenHideSpy = jest.spyOn(SplashScreen, 'hide');

      await component.ngOnInit();
      expect(platformReadySpy).toHaveBeenCalled();
      // Wait for the promise in ngOnInit to resolve
      await platformReadySpy.mock.results[0].value;
      expect(splashScreenHideSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call App.removeAllListeners', () => {
      const appRemoveAllListenersSpy = jest.spyOn(App, 'removeAllListeners');

      component.ngOnDestroy();

      expect(appRemoveAllListenersSpy).toHaveBeenCalled();
    });
  });

  describe('handleBackButton', () => {
    it('should call App.exitApp if canGoBack is false', () => {
      const appExitAppSpy = jest.spyOn(App, 'exitApp');

      component['handleBackButton'](false);

      expect(appExitAppSpy).toHaveBeenCalled();
    });

    it('should call window.history.back if canGoBack is true', () => {
      const windowHistoryBackSpy = jest.spyOn(window.history, 'back');

      component['handleBackButton'](true);

      expect(windowHistoryBackSpy).toHaveBeenCalled();
    });
  });
});
