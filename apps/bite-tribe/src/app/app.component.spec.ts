import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';

jest.mock('localization');
jest.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: jest.fn(),
  },
}));

describe('AppComponent', () => {
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
});
