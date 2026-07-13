import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter, Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { AppForegroundService } from 'bite-tribe/shell';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { fromAuth } from 'ta-firestore';

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
    exitApp: jest.fn(),
    minimizeApp: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: jest.fn(),
  },
}));

jest.mock('@capacitor/network', () => ({
  Network: {
    addListener: jest.fn(),
    getStatus: jest.fn(() => of({})),
  },
}));

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: (): any => Promise.resolve({ value: null }),
  },
}));

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
  setActiveLang: jest.fn(),
};

const MockAppForegroundService = {
  handleAppStateChange: jest.fn(),
};

describe(AppComponent.name, () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: fromAuth.selectIsAuthenticated, value: false },
          ],
        }),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: AppForegroundService, useValue: MockAppForegroundService },
      ],
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  describe('backButtonHandler', () => {
    it('should call handleBackButton with correct canGoBack value', () => {
      const handleBackButtonSpy = jest.spyOn(
        component as any,
        'handleBackButton',
      );

      const testCanGoBack = true;
      component.backButtonHandler({ canGoBack: testCanGoBack });

      expect(handleBackButtonSpy).toHaveBeenCalledWith(testCanGoBack);
    });
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

    it('should initialize app state change handler', () => {
      const appAddListenerSpy = jest.spyOn(App, 'addListener');

      component['initAppStateChangeHandler']();

      expect(appAddListenerSpy).toHaveBeenCalledWith(
        'appStateChange',
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
    it('should call App.minimizeApp if canGoBack is false', () => {
      const appMinimizeAppSpy = jest.spyOn(App, 'minimizeApp');

      component['handleBackButton'](false);

      expect(appMinimizeAppSpy).toHaveBeenCalled();
    });

    it('should call App.minimizeApp if current route is home view', () => {
      const appMinimizeAppSpy = jest.spyOn(App, 'minimizeApp');
      jest.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/home');

      component['handleBackButton'](true);

      expect(appMinimizeAppSpy).toHaveBeenCalled();
    });

    it('should call window.history.back if canGoBack is true and not on home view', () => {
      const windowHistoryBackSpy = jest.spyOn(window.history, 'back');
      jest
        .spyOn(TestBed.inject(Router), 'url', 'get')
        .mockReturnValue('/bite/123');

      component['handleBackButton'](true);

      expect(windowHistoryBackSpy).toHaveBeenCalled();
    });
  });

  describe('appUrlOpen Handler', () => {
    describe('given a shared link', () => {
      it('should navigate to the correct bite', () => {
        const navControllerNavigateForwardSpy = jest
          .spyOn(component.navController, 'navigateForward')
          .mockImplementation();

        const testUrl = 'https://example.com/s/bite/123';
        const addListenerCalls = (App.addListener as jest.Mock).mock.calls;
        const whereAppUrlOpen = ([event]: [any]): boolean =>
          event === 'appUrlOpen';
        const appUrlOpenListener = addListenerCalls.find(whereAppUrlOpen)[1];
        appUrlOpenListener({ url: testUrl });

        expect(navControllerNavigateForwardSpy).toHaveBeenCalledWith([
          'bite',
          '123',
        ]);
      });
    });

    describe('given another link', () => {
      it('should not navigate', () => {
        const navControllerNavigateForwardSpy = jest
          .spyOn(component.navController, 'navigateForward')
          .mockImplementation();

        const testUrl = 'https://example.com/other/path';
        const addListenerCalls = (App.addListener as jest.Mock).mock.calls;
        const whereAppUrlOpen = ([event]: [any]): boolean =>
          event === 'appUrlOpen';
        const appUrlOpenListener = addListenerCalls.find(whereAppUrlOpen)[1];
        appUrlOpenListener({ url: testUrl });

        expect(navControllerNavigateForwardSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('appStateChange Handler', () => {
    it('should delegate to AppForegroundService.handleAppStateChange', () => {
      const appForegroundService = TestBed.inject(AppForegroundService);
      const handleAppStateChangeSpy = jest.spyOn(
        appForegroundService,
        'handleAppStateChange',
      );

      const addListenerCalls = (App.addListener as jest.Mock).mock.calls;
      const whereAppStateChange = ([event]: [string]): boolean =>
        event === 'appStateChange';
      const appStateChangeListener =
        addListenerCalls.find(whereAppStateChange)[1];
      appStateChangeListener({ isActive: true });

      expect(handleAppStateChangeSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('initNetworkStatusHandler', () => {
    it('should call setNetworkStatus when listeners callback is called', () => {
      const addListenerCalls = (Network.addListener as jest.Mock).mock.calls;

      const setNetworkStatusSpy = jest.spyOn(
        (component as any).networkStatusService,
        'setNetworkStatus',
      );
      addListenerCalls.find(([event]) => event === 'networkStatusChange')[1]({
        connected: true,
      });

      expect(setNetworkStatusSpy).toHaveBeenCalledWith({ connected: true });
    });
  });

  describe('initLanguage', () => {
    describe('given not lang in preferences', () => {
      beforeEach(() => {
        jest
          .spyOn(Preferences, 'get')
          .mockImplementation(() => Promise.resolve({ value: null }));
      });

      it('should call setActiveLang with default lang', async () => {
        const setActiveLangSpy = MockTranslocoService.setActiveLang;

        await component.initLanguage();

        expect(setActiveLangSpy).toHaveBeenCalledWith('en');
      });
    });

    describe('given lang in preferences', () => {
      beforeEach(() => {
        jest
          .spyOn(Preferences, 'get')
          .mockImplementation(() => Promise.resolve({ value: 'de' }));
      });
      it('should call setActiveLang with lang from preferences', async () => {
        const setActiveLangSpy = MockTranslocoService.setActiveLang;
        const testLang = 'fr';
        (Preferences.get as jest.Mock).mockResolvedValue({ value: testLang });

        await component.initLanguage();

        expect(setActiveLangSpy).toHaveBeenCalledWith(testLang);
      });
    });
  });
});
