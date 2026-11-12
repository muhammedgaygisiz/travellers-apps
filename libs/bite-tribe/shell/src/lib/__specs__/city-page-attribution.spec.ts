import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import {
  provideCityPageAttribution,
  readCityPageArrival,
} from '../city-page-attribution';

const at = (
  pathname: string,
  search: string,
): { pathname: string; search: string } => ({ pathname, search });

describe(readCityPageArrival.name, () => {
  it('reads the call to action, which opens the root', () => {
    expect(readCityPageArrival(at('/', '?city_page=best-sushi'))).toEqual({
      page_slug: 'best-sushi',
      destination: 'start',
    });
  });

  it('reads an entry, which opens its Bite', () => {
    expect(
      readCityPageArrival(at('/bite/abc123', '?city_page=best-sushi')),
    ).toEqual({ page_slug: 'best-sushi', destination: 'bite' });
  });

  it.each([
    ['no parameter', at('/', '')],
    ['an empty slug', at('/', '?city_page=')],
    ['a slug the editor would refuse', at('/', '?city_page=Best%20Sushi')],
    ['an over-long slug', at('/', `?city_page=${'a'.repeat(81)}`)],
    ['a path no city page links to', at('/home', '?city_page=best-sushi')],
    ['a Bite sub-route', at('/bite/abc/edit', '?city_page=best-sushi')],
  ])('ignores %s', (_case, location) => {
    expect(readCityPageArrival(location)).toBeUndefined();
  });
});

describe(provideCityPageAttribution.name, () => {
  const logEvent = jest.fn();

  const startAt = async (url: string): Promise<void> => {
    window.history.replaceState({}, '', url);
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { logEvent } },
        provideCityPageAttribution(),
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
  };

  afterEach(() => {
    logEvent.mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('records an arrival from a city page at start-up', async () => {
    await startAt('/bite/abc123?city_page=best-sushi');

    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CityPageArrived, {
      page_slug: 'best-sushi',
      destination: 'bite',
    });
  });

  it('records nothing for an ordinary start-up', async () => {
    await startAt('/home');

    expect(logEvent).not.toHaveBeenCalled();
  });
});
