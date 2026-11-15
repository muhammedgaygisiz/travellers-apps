import { AboutContainerComponent } from '../about-container.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(AboutContainerComponent.name, () => {
  let component: AboutContainerComponent;
  let fixture: ComponentFixture<AboutContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to About', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');

      component.ionViewDidEnter();

      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'About',
      });
    });
  });

  // The counts live in a root service and outlive the page; every entry has
  // to refresh them, and Ionic does not reliably raise the view lifecycle
  // events on re-entry (GitHub issue #2072).
  describe('refreshing the counts', () => {
    it('refreshes them when the page is created', () => {
      const reload = jest.spyOn(component.service, 'reloadCounts');

      component.ngOnInit();

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('refreshes them when a cached page is shown again', () => {
      const reload = jest.spyOn(component.service, 'reloadCounts');

      component.ionViewWillEnter();

      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});
