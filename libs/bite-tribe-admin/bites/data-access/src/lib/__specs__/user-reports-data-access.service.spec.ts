const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import { UserReportsDataAccessService } from '../user-reports-data-access.service';

/** GitHub issue #1829. */
describe(UserReportsDataAccessService.name, () => {
  let service: UserReportsDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    callByNameMock.mockResolvedValue({ data: undefined });
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserReportsDataAccessService);
  });

  it('lists the open reports through listUserReports', async () => {
    const answer = { users: [], truncated: true };
    callByNameMock.mockResolvedValue({ data: answer });

    await expect(service.list()).resolves.toBe(answer);
    expect(callByNameMock).toHaveBeenCalledWith({ name: 'listUserReports' });
  });

  it('reads an empty answer as an empty queue', async () => {
    await expect(service.list()).resolves.toEqual({
      users: [],
      truncated: false,
    });
  });

  it('dismisses with a trimmed reason', async () => {
    await service.dismiss('u1', '  Blocked.  ');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'dismissUserReports',
      data: { uid: 'u1', reason: 'Blocked.' },
    });
  });

  // The existing account block (issue #1474), never an unblock.
  it('blocks the account through setUserBlocked', async () => {
    await service.blockAccount('u1');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserBlocked',
      data: { uid: 'u1', blocked: true },
    });
  });

  it('does not swallow a failure', async () => {
    callByNameMock.mockRejectedValue(new Error('permission-denied'));

    await expect(service.dismiss('u1', 'Fine')).rejects.toThrow(
      'permission-denied',
    );
  });
});
