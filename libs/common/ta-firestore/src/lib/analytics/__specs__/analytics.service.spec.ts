import { TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsEvent } from '../analytics-events';

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    logEvent: jest.fn(),
    setUserProperty: jest.fn(),
  },
}));

describe('AnalyticsService', (): void => {
  let service: AnalyticsService;
  const logEventMock = FirebaseAnalytics.logEvent as jest.Mock;
  const setUserPropertyMock = FirebaseAnalytics.setUserProperty as jest.Mock;

  /**
   * A fresh injector per surface, because the service reads the bundle flag
   * once - the flag identifies the bundle, so a service that re-read it per
   * event would be modelling something that cannot happen.
   */
  const createService = (): AnalyticsService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AnalyticsService] });

    return TestBed.inject(AnalyticsService);
  };

  beforeEach(() => {
    delete process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'];
    logEventMock.mockReset();
    logEventMock.mockResolvedValue(undefined);
    setUserPropertyMock.mockReset();
    setUserPropertyMock.mockResolvedValue(undefined);

    service = createService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('forwards an event without params', async () => {
    service.logEvent(AnalyticsEvent.BiteCreated);
    await flush();

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'bite_created',
      params: undefined,
    });
  });

  it('forwards an event with typed params', async () => {
    service.logEvent(AnalyticsEvent.BucketListRated, { rating: 5 });
    await flush();

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'bucketlist_rated',
      params: { rating: 5 },
    });
  });

  /**
   * The guard that used to silence the whole business app now silences the
   * events that do not belong to it (GitHub issue #1098). A `sign_up` from a
   * staff tablet would count a shift as an activation.
   */
  it('drops a consumer event in the business app', () => {
    process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

    createService().logEvent(AnalyticsEvent.SignUp, { method: 'password' });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('drops a business event in the consumer app', () => {
    service.logEvent(AnalyticsEvent.TableSeated, {
      restaurant_id: 'restaurant-1',
      table_id: 'table-1',
      table_count: 12,
      from_status: 'available',
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('forwards a business event in the business app', async () => {
    process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

    createService().logEvent(AnalyticsEvent.TableSeated, {
      restaurant_id: 'restaurant-1',
      table_id: 'table-1',
      table_count: 12,
      from_status: 'available',
      guests: 4,
    });
    await flush();

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'table_seated',
      params: {
        restaurant_id: 'restaurant-1',
        table_id: 'table-1',
        table_count: 12,
        from_status: 'available',
        guests: 4,
      },
    });
  });

  /**
   * Both apps report to one GA4 property through one measurement id, so the
   * only thing separating a staff shift from a diner's session is this
   * property. It is said once and before the first event leaves.
   */
  it('declares its surface once, ahead of the first event', async () => {
    service.logEvent(AnalyticsEvent.BiteCreated);
    service.logEvent(AnalyticsEvent.SearchPerformed);
    await flush();

    expect(setUserPropertyMock).toHaveBeenCalledTimes(1);
    expect(setUserPropertyMock).toHaveBeenCalledWith({
      key: 'app_surface',
      value: 'consumer',
    });
    expect(setUserPropertyMock.mock.invocationCallOrder[0]).toBeLessThan(
      logEventMock.mock.invocationCallOrder[0],
    );
  });

  it('declares the business surface in the business app', async () => {
    process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

    createService().logEvent(AnalyticsEvent.TableDisabled, {
      restaurant_id: 'restaurant-1',
      table_id: 'table-1',
      table_count: 12,
      from_status: 'available',
    });
    await flush();

    expect(setUserPropertyMock).toHaveBeenCalledWith({
      key: 'app_surface',
      value: 'business',
    });
  });

  /** A property that cannot be written must not take the event with it. */
  it('still sends the event when the surface cannot be declared', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    setUserPropertyMock.mockRejectedValue(new Error('no analytics'));

    service.logEvent(AnalyticsEvent.BiteCreated);
    await flush();

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'bite_created',
      params: undefined,
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to declare the analytics surface:',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });

  it('swallows tracking failures', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    logEventMock.mockRejectedValue(new Error('analytics down'));

    expect(() =>
      service.logEvent(AnalyticsEvent.SearchPerformed),
    ).not.toThrow();

    await flush();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to log analytics event "search_performed":',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });
});

/**
 * Lets the fire-and-forget send resolve.
 *
 * More than one turn, because the surface declaration is awaited before the
 * event and each of the two is its own microtask.
 */
const flush = async (): Promise<void> => {
  for (let round = 0; round < 4; round += 1) {
    await Promise.resolve();
  }
};
