const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import {
  LandingPageDraft,
  LandingPagesDataAccessService,
  landingPageUrl,
} from '../landing-pages-data-access.service';

const draft: LandingPageDraft = {
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'DE',
  locale: 'en',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five dishes.',
  intro: 'Why these.',
  biteIds: ['b1', 'b2', 'b3'],
  aliases: [],
};

describe(LandingPagesDataAccessService.name, () => {
  let service: LandingPagesDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LandingPagesDataAccessService);
  });

  it('lists through listLandingPages', async () => {
    callByNameMock.mockResolvedValue({ data: [{ ...draft }] });

    await expect(service.list()).resolves.toEqual([draft]);
    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'listLandingPages',
      data: {},
    });
  });

  it('lists nothing when the callable returns no data', async () => {
    callByNameMock.mockResolvedValue({ data: null });

    await expect(service.list()).resolves.toEqual([]);
  });

  it('saves through saveLandingPage', async () => {
    callByNameMock.mockResolvedValue({ data: { ...draft, status: 'draft' } });

    await service.save(draft);

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'saveLandingPage',
      data: draft,
    });
  });

  it('returns the preview HTML', async () => {
    callByNameMock.mockResolvedValue({ data: { html: '<!doctype html>' } });

    await expect(service.preview(draft)).resolves.toBe('<!doctype html>');
    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'previewLandingPage',
      data: draft,
    });
  });

  it('publishes and withdraws through setLandingPageStatus', async () => {
    callByNameMock.mockResolvedValue({ data: {} });

    await service.setStatus('berlin', 'withdrawn');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setLandingPageStatus',
      data: { city: 'berlin', status: 'withdrawn' },
    });
  });

  it('does not swallow a failure', async () => {
    callByNameMock.mockRejectedValue(new Error('failed-precondition'));

    await expect(service.setStatus('x', 'published')).rejects.toThrow(
      'failed-precondition',
    );
  });

  it('builds the public URL on the canonical host', () => {
    expect(landingPageUrl(draft)).toBe('https://bitetribe.app/eat/berlin');
  });
});
