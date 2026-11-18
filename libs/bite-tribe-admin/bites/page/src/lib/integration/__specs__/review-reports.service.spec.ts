import { TestBed } from '@angular/core/testing';
import { ReportedReview } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { ReviewReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';
import { ReviewReportsService } from '../review-reports.service';

const reported = (over: Partial<ReportedReview> = {}): ReportedReview => ({
  reviewId: 'r1',
  exists: true,
  text: 'Nobody asked you.',
  authorUid: 'u1',
  authorDisplayName: 'troll',
  biteId: 'b1',
  biteName: 'Ramen',
  reportCount: 2,
  reasons: { harassment: 2, hate: 0, spam: 0, inappropriate: 0, other: 0 },
  firstReportedAt: '2026-11-01T10:00:00.000Z',
  lastReportedAt: '2026-11-02T10:00:00.000Z',
  ...over,
});

/** GitHub issue #2117. */
describe(ReviewReportsService.name, () => {
  let service: ReviewReportsService;
  let list: jest.Mock;
  let dismiss: jest.Mock;
  let blockAuthor: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({
      reviews: [reported(), reported({ reviewId: 'r2' })],
      truncated: false,
    });
    dismiss = jest
      .fn()
      .mockResolvedValue({ reviewId: 'r1', dismissedReports: 2 });
    blockAuthor = jest.fn().mockResolvedValue(undefined);
    present = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReviewReportsDataAccessService,
          useValue: { list, dismiss, blockAuthor },
        },
        { provide: BiteTribeStoreService, useValue: { logout: jest.fn() } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(ReviewReportsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the queue', async () => {
    await service.load();

    expect(service.reports().map((review) => review.reviewId)).toEqual([
      'r1',
      'r2',
    ]);
    expect(service.loaded()).toBe(true);
    expect(service.failed()).toBe(false);
  });

  it('tells a failed load apart from an empty queue', async () => {
    list.mockRejectedValue(new Error('internal'));

    await service.load();

    expect(service.reports()).toEqual([]);
    expect(service.failed()).toBe(true);
  });

  it('resolves the selection out of the list', async () => {
    await service.load();

    service.select(reported({ reviewId: 'r2' }));

    expect(service.selected()?.reviewId).toBe('r2');
  });

  it('keeps a review: its reports close and it leaves the queue', async () => {
    await service.load();
    service.select(reported());

    await service.dismiss('r1', 'Banter.');

    expect(dismiss).toHaveBeenCalledWith('r1', 'Banter.');
    expect(service.reports().map((review) => review.reviewId)).toEqual(['r2']);
    expect(service.selected()).toBeUndefined();
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-review-reports-dismissed',
      outcome: 'success',
    });
  });

  it('blocks the author and leaves the review in the queue, marked', async () => {
    await service.load();

    await service.blockAuthor('u1');

    expect(blockAuthor).toHaveBeenCalledWith('u1');
    expect(service.blockedAuthors().has('u1')).toBe(true);
    expect(service.reports()).toHaveLength(2);
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-review-reports-author-blocked',
      outcome: 'success',
    });
  });

  it('says a failed action failed and changes nothing', async () => {
    await service.load();
    dismiss.mockRejectedValue(new Error('unavailable'));

    await service.dismiss('r1', 'Banter.');

    expect(service.reports()).toHaveLength(2);
    expect(service.action()).toBeUndefined();
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-review-reports-dismiss-failed',
      outcome: 'failure',
    });
  });

  it('has no selection before one is made', async () => {
    await service.load();

    expect(service.selected()).toBeUndefined();
  });

  it('signs out through the store', () => {
    const store = TestBed.inject(BiteTribeStoreService) as unknown as {
      logout: jest.Mock;
    };

    service.logout();

    expect(store.logout).toHaveBeenCalled();
  });
});
