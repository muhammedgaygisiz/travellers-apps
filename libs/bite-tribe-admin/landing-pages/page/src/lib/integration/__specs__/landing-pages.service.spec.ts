import { TestBed } from '@angular/core/testing';
import { SearchBite } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { BiteSearchDataAccessService } from 'bite-tribe-admin/bites-data-access';
import {
  LandingPage,
  LandingPagesDataAccessService,
} from 'bite-tribe-admin/landing-pages-data-access';
import { LandingPagesService } from '../landing-pages.service';

const searchBite = (n: number): SearchBite => ({
  id: `b${n}`,
  name: `Dish ${n}`,
  place: `Place ${n}`,
  imagePath: `https://example.test/${n}.jpg`,
});

const stored: LandingPage = {
  slug: 'best-sushi',
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'DE',
  locale: 'en',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five dishes.',
  intro: 'Why these.',
  biteIds: ['b1', 'b2', 'b3'],
  status: 'draft',
  items: [1, 2, 3].map((n) => ({
    biteId: `b${n}`,
    name: `Dish ${n}`,
    imageUrl: `https://example.test/${n}.jpg`,
    place: `Place ${n}`,
  })),
};

describe(LandingPagesService.name, () => {
  let service: LandingPagesService;
  let dataAccess: Record<string, jest.Mock>;
  let present: jest.Mock;

  beforeEach(() => {
    dataAccess = {
      list: jest.fn().mockResolvedValue([stored]),
      save: jest
        .fn()
        .mockImplementation(async (draft) => ({ ...stored, ...draft })),
      preview: jest.fn().mockResolvedValue('<!doctype html>'),
      setStatus: jest.fn().mockImplementation(async (slug, status) => ({
        ...stored,
        slug,
        status,
      })),
    };
    present = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: LandingPagesDataAccessService, useValue: dataAccess },
        {
          provide: BiteSearchDataAccessService,
          useValue: { search: jest.fn().mockResolvedValue([searchBite(4)]) },
        },
        { provide: BiteTribeStoreService, useValue: { logout: jest.fn() } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(LandingPagesService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('reopens a saved page with its fields and Bites in order', async () => {
    await service.load();
    service.open(service.pages()[0]);

    expect(service.draft()).toEqual({
      slug: 'best-sushi',
      city: 'berlin',
      cityName: 'Berlin',
      countryCode: 'DE',
      locale: 'en',
      title: 'The best sushi in Berlin',
      metaDescription: 'Five dishes.',
      intro: 'Why these.',
      biteIds: ['b1', 'b2', 'b3'],
    });
    expect(service.publishable()).toBe(true);
  });

  it('saves the Bites in the order they were arranged', async () => {
    service.open(stored);
    service.move('b3', -1);
    service.move('b1', 1);

    await service.save();

    expect(dataAccess['save']).toHaveBeenCalledWith(
      expect.objectContaining({ biteIds: ['b3', 'b1', 'b2'] }),
    );
  });

  it('adds a Bite once, and no more than five', () => {
    service.newPage();
    [1, 1, 2, 3, 4, 5, 6].forEach((n) => service.addBite(searchBite(n)));

    expect(service.draft().biteIds).toEqual(['b1', 'b2', 'b3', 'b4', 'b5']);
    expect(service.full()).toBe(true);
  });

  it('is not publishable outside three to five Bites', () => {
    service.open(stored);
    service.removeBite('b3');

    expect(service.publishable()).toBe(false);
  });

  it('publishes by saving first, so the live page is what is on screen', async () => {
    service.open(stored);
    service.updateField('title', 'New title');

    await service.publish();

    expect(dataAccess['save']).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New title' }),
    );
    expect(dataAccess['setStatus']).toHaveBeenCalledWith(
      'best-sushi',
      'published',
    );
    expect(service.current()?.status).toBe('published');
  });

  it('withdraws the current page', async () => {
    service.open({ ...stored, status: 'published' });

    await service.withdraw();

    expect(dataAccess['setStatus']).toHaveBeenCalledWith(
      'best-sushi',
      'withdrawn',
    );
  });

  it('shows the preview without saving', async () => {
    service.open(stored);

    await service.preview();

    expect(service.previewHtml()).toBe('<!doctype html>');
    expect(dataAccess['save']).not.toHaveBeenCalled();
  });

  it("passes the callable's reason to the failure toast", async () => {
    dataAccess['setStatus'].mockRejectedValue(
      new Error('A published page needs 3 to 5 Bites.'),
    );
    service.open(stored);

    await service.publish();

    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-landing-publish-failed',
      outcome: 'failure',
      params: { detail: 'A published page needs 3 to 5 Bites.' },
    });
  });
});
