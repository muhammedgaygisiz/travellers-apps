const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import { BiteReportsDataAccessService } from '../bite-reports-data-access.service';

describe(BiteReportsDataAccessService.name, () => {
  let service: BiteReportsDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    callByNameMock.mockResolvedValue({ data: undefined });
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiteReportsDataAccessService);
  });

  it('lists the open reports through listBiteReports', async () => {
    const answer = { bites: [], truncated: true };
    callByNameMock.mockResolvedValue({ data: answer });

    await expect(service.list()).resolves.toBe(answer);
    expect(callByNameMock).toHaveBeenCalledWith({ name: 'listBiteReports' });
  });

  it('reads an empty answer as an empty queue', async () => {
    await expect(service.list()).resolves.toEqual({
      bites: [],
      truncated: false,
    });
  });

  it('dismisses with a trimmed reason', async () => {
    await service.dismiss('b1', '  It is food.  ');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'dismissBiteReports',
      data: { biteId: 'b1', reason: 'It is food.' },
    });
  });

  // The same callable the Bite lookup deletes through (issue #1475).
  it('deletes through deleteBiteAsOperator', async () => {
    await service.deleteBite('b1', 'Not food');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'deleteBiteAsOperator',
      data: { biteId: 'b1', reason: 'Not food' },
    });
  });

  // Always a block: the queue never offers an unblock (issue #1474).
  it('blocks the author through setUserBlocked', async () => {
    await service.blockAuthor('author-1');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserBlocked',
      data: { uid: 'author-1', blocked: true },
    });
  });

  it('does not swallow a failure', async () => {
    callByNameMock.mockRejectedValue(new Error('permission-denied'));

    await expect(service.dismiss('b1', 'Fine')).rejects.toThrow(
      'permission-denied',
    );
  });
});
