import { TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsEvent } from '../analytics-events';

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    logEvent: jest.fn(),
  },
}));

describe('AnalyticsService', (): void => {
  let service: AnalyticsService;
  const logEventMock = FirebaseAnalytics.logEvent as jest.Mock;

  beforeEach(() => {
    delete process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'];
    logEventMock.mockReset();
    logEventMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({ providers: [AnalyticsService] });
    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('forwards an event without params', () => {
    service.logEvent(AnalyticsEvent.BiteCreated);

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'bite_created',
      params: undefined,
    });
  });

  it('forwards an event with typed params', () => {
    service.logEvent(AnalyticsEvent.BucketListRated, { rating: 5 });

    expect(logEventMock).toHaveBeenCalledWith({
      name: 'bucketlist_rated',
      params: { rating: 5 },
    });
  });

  it('no-ops in the business app', () => {
    process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] = 'true';

    service.logEvent(AnalyticsEvent.SignUp, { method: 'password' });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('swallows tracking failures', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    logEventMock.mockRejectedValue(new Error('analytics down'));

    expect(() =>
      service.logEvent(AnalyticsEvent.SearchPerformed),
    ).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to log analytics event "search_performed":',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });
});
