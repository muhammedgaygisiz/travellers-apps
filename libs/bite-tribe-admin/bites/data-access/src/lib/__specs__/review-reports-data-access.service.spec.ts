const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import { ReviewReportsDataAccessService } from '../review-reports-data-access.service';

/** GitHub issue #2117. */
describe(ReviewReportsDataAccessService.name, () => {
  let service: ReviewReportsDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    callByNameMock.mockResolvedValue({ data: undefined });
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReviewReportsDataAccessService);
  });

  it('lists the open reports through listReviewReports', async () => {
    const answer = { reviews: [], truncated: true };
    callByNameMock.mockResolvedValue({ data: answer });

    await expect(service.list()).resolves.toBe(answer);
    expect(callByNameMock).toHaveBeenCalledWith({ name: 'listReviewReports' });
  });

  it('reads an empty answer as an empty queue', async () => {
    await expect(service.list()).resolves.toEqual({
      reviews: [],
      truncated: false,
    });
  });

  it('keeps a review with a trimmed reason', async () => {
    await service.dismiss('reply-1', '  Banter.  ');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'dismissReviewReports',
      data: { reviewId: 'reply-1', reason: 'Banter.' },
    });
  });

  // Issue #2118: hiding takes the same trimmed, required reason.
  it('hides a review through hideReviewAsOperator with a trimmed reason', async () => {
    await service.hide('reply-1', '  Harassment.  ');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'hideReviewAsOperator',
      data: { reviewId: 'reply-1', reason: 'Harassment.' },
    });
  });

  // The existing account block (issue #1474), never an unblock.
  it('blocks the author through setUserBlocked', async () => {
    await service.blockAuthor('u1');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserBlocked',
      data: { uid: 'u1', blocked: true },
    });
  });

  it('does not swallow a failure', async () => {
    callByNameMock.mockRejectedValue(new Error('permission-denied'));

    await expect(service.dismiss('reply-1', 'Fine')).rejects.toThrow(
      'permission-denied',
    );
  });
});
