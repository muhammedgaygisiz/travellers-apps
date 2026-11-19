import { TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { DashboardContainer } from '../dashboard-container.component';
import { DashboardService } from '../dashboard.service';
import { DashboardComponent } from '../../component/page/dashboard.component';

/** See GitHub issues #2126 and #2127. */
describe(DashboardContainer.name, () => {
  let refreshRestaurants: jest.Mock;
  let container: DashboardContainer;

  beforeEach(() => {
    refreshRestaurants = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: DashboardService,
          useValue: {
            isAuthenticated: signal(true),
            gpsPosition: signal(undefined),
            restaurantsValue: signal([]),
            restaurantsLoaded: signal(true),
            refreshRestaurants,
          },
        },
      ],
    }).overrideComponent(DashboardContainer, {
      remove: { imports: [DashboardComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });

    container = TestBed.createComponent(DashboardContainer).componentInstance;
  });

  it('re-reads the restaurants each time the page is entered', () => {
    container.ionViewWillEnter();

    expect(refreshRestaurants).toHaveBeenCalledTimes(1);
  });

  it('re-reads when the tab becomes visible again, so an assignment shows without signing out', () => {
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refreshRestaurants).toHaveBeenCalledTimes(1);
  });

  it('does not re-read when the tab is hidden', () => {
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refreshRestaurants).not.toHaveBeenCalled();
  });
});
