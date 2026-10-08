import { TestBed } from '@angular/core/testing';
import { ReportedBite } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { BiteReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';
import { BiteReportsService } from '../bite-reports.service';

const reported = (over: Partial<ReportedBite> = {}): ReportedBite => ({
  biteId: 'b1',
  exists: true,
  name: 'Ramen',
  place: 'Noodle Bar',
  description: '',
  tags: [],
  imageSrc: '',
  authorUid: 'author-1',
  authorDisplayName: 'Author',
  reportCount: 2,
  reasons: { spam: 2, notFood: 0, inappropriate: 0, harassment: 0, other: 0 },
  firstReportedAt: '2026-10-01T10:00:00.000Z',
  lastReportedAt: '2026-10-02T10:00:00.000Z',
  ...over,
});

describe(BiteReportsService.name, () => {
  let service: BiteReportsService;
  let list: jest.Mock;
  let dismiss: jest.Mock;
  let deleteBite: jest.Mock;
  let blockAuthor: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({
      bites: [reported(), reported({ biteId: 'b2', authorUid: 'author-2' })],
      truncated: false,
    });
    dismiss = jest
      .fn()
      .mockResolvedValue({ biteId: 'b1', dismissedReports: 2 });
    deleteBite = jest.fn().mockResolvedValue({ biteId: 'b1' });
    blockAuthor = jest.fn().mockResolvedValue(undefined);
    present = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BiteReportsDataAccessService,
          useValue: { list, dismiss, deleteBite, blockAuthor },
        },
        { provide: BiteTribeStoreService, useValue: { logout: jest.fn() } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(BiteReportsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the queue', async () => {
    await service.load();

    expect(service.reports().map((bite) => bite.biteId)).toEqual(['b1', 'b2']);
    expect(service.loaded()).toBe(true);
    expect(service.failed()).toBe(false);
  });

  it('says the queue failed rather than showing it empty', async () => {
    list.mockRejectedValue(new Error('unavailable'));

    await service.load();

    expect(service.reports()).toEqual([]);
    expect(service.failed()).toBe(true);
  });

  it('carries a truncated listing through', async () => {
    list.mockResolvedValue({ bites: [], truncated: true });

    await service.load();

    expect(service.truncated()).toBe(true);
  });

  it('takes a deleted Bite out of the queue and the detail column', async () => {
    await service.load();
    service.select(reported());

    await service.deleteBite('b1', 'Not food');

    expect(deleteBite).toHaveBeenCalledWith('b1', 'Not food');
    expect(service.reports().map((bite) => bite.biteId)).toEqual(['b2']);
    expect(service.selected()).toBeUndefined();
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-reports-deleted',
      outcome: 'success',
    });
  });

  it('takes a dismissed Bite out of the queue', async () => {
    await service.load();

    await service.dismiss('b1', 'It is food.');

    expect(dismiss).toHaveBeenCalledWith('b1', 'It is food.');
    expect(service.reports().map((bite) => bite.biteId)).toEqual(['b2']);
  });

  it('keeps a Bite in the queue when its author is blocked', async () => {
    await service.load();
    service.select(reported());

    await service.blockAuthor('author-1');

    expect(blockAuthor).toHaveBeenCalledWith('author-1');
    expect(service.reports().map((bite) => bite.biteId)).toEqual(['b1', 'b2']);
    expect(service.selectedAuthorBlocked()).toBe(true);
  });

  it('keeps the Bite and says so when an action fails', async () => {
    deleteBite.mockRejectedValue(new Error('internal'));
    await service.load();

    await service.deleteBite('b1', 'Not food');

    expect(service.reports().map((bite) => bite.biteId)).toEqual(['b1', 'b2']);
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-reports-delete-failed',
      outcome: 'failure',
    });
    expect(service.action()).toBeUndefined();
  });

  it('selects nothing until a Bite is chosen', async () => {
    await service.load();

    expect(service.selected()).toBeUndefined();
    expect(service.selectedAuthorBlocked()).toBe(false);
  });

  it('logs out through the store', () => {
    const store = TestBed.inject(BiteTribeStoreService) as unknown as {
      logout: jest.Mock;
    };

    service.logout();

    expect(store.logout).toHaveBeenCalled();
  });
});
