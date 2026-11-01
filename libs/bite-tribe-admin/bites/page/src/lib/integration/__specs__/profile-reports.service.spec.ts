import { TestBed } from '@angular/core/testing';
import { ReportedUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { UserReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';
import { ProfileReportsService } from '../profile-reports.service';

const reported = (over: Partial<ReportedUser> = {}): ReportedUser => ({
  uid: 'u1',
  exists: true,
  displayName: 'troll',
  photoUrl: '',
  about: '',
  blocked: false,
  recentBites: [],
  reportCount: 2,
  reasons: {
    harassment: 2,
    impersonation: 0,
    spam: 0,
    inappropriate: 0,
    other: 0,
  },
  firstReportedAt: '2026-10-01T10:00:00.000Z',
  lastReportedAt: '2026-10-02T10:00:00.000Z',
  ...over,
});

/** GitHub issue #1829. */
describe(ProfileReportsService.name, () => {
  let service: ProfileReportsService;
  let list: jest.Mock;
  let dismiss: jest.Mock;
  let blockAccount: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({
      users: [reported(), reported({ uid: 'u2' })],
      truncated: false,
    });
    dismiss = jest.fn().mockResolvedValue({ uid: 'u1', dismissedReports: 2 });
    blockAccount = jest.fn().mockResolvedValue(undefined);
    present = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserReportsDataAccessService,
          useValue: { list, dismiss, blockAccount },
        },
        { provide: BiteTribeStoreService, useValue: { logout: jest.fn() } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(ProfileReportsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the queue', async () => {
    await service.load();

    expect(service.reports().map((user) => user.uid)).toEqual(['u1', 'u2']);
    expect(service.loaded()).toBe(true);
    expect(service.failed()).toBe(false);
  });

  it('tells a failed load apart from an empty queue', async () => {
    list.mockRejectedValue(new Error('internal'));

    await service.load();

    expect(service.reports()).toEqual([]);
    expect(service.failed()).toBe(true);
    expect(service.loaded()).toBe(true);
  });

  it('resolves the selection out of the list', async () => {
    await service.load();
    service.select(reported({ uid: 'u2' }));

    expect(service.selected()?.uid).toBe('u2');
  });

  it('marks the account blocked and keeps it in the queue', async () => {
    await service.load();
    service.select(reported());

    await service.blockAccount('u1');

    expect(blockAccount).toHaveBeenCalledWith('u1');
    expect(service.selected()?.blocked).toBe(true);
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-profile-reports-blocked',
      outcome: 'success',
    });
    expect(service.action()).toBeUndefined();
  });

  it('says so when the block failed, and changes nothing', async () => {
    blockAccount.mockRejectedValue(new Error('internal'));
    await service.load();
    service.select(reported());

    await service.blockAccount('u1');

    expect(service.selected()?.blocked).toBe(false);
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-profile-reports-block-failed',
      outcome: 'failure',
    });
  });

  it('drops a dismissed profile from the queue', async () => {
    await service.load();
    service.select(reported());

    await service.dismiss('u1', 'Blocked.');

    expect(dismiss).toHaveBeenCalledWith('u1', 'Blocked.');
    expect(service.reports().map((user) => user.uid)).toEqual(['u2']);
    expect(service.selected()).toBeUndefined();
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-profile-reports-dismissed',
      outcome: 'success',
    });
  });

  it('keeps the profile when the dismissal failed', async () => {
    dismiss.mockRejectedValue(new Error('internal'));
    await service.load();

    await service.dismiss('u1', 'Fine');

    expect(service.reports()).toHaveLength(2);
    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-profile-reports-dismiss-failed',
      outcome: 'failure',
    });
  });
});
