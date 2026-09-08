const callByNameMock = jest.fn();

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: callByNameMock },
}));

import { TestBed } from '@angular/core/testing';
import { UserManagementDataAccessService } from '../user-management-data-access.service';
import { AdminUser } from '../admin-user.model';

const user = (over: Partial<AdminUser> = {}): AdminUser => ({
  uid: 'u1',
  email: 'a@example.com',
  displayName: '',
  roles: [],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '',
  lastSignInAt: '',
  subscriptionTier: 0,
  ...over,
});

describe(UserManagementDataAccessService.name, () => {
  let service: UserManagementDataAccessService;

  const loadUsers = (users: AdminUser[]): Promise<AdminUser[]> => {
    callByNameMock.mockResolvedValue({ data: { users } });
    return service.fetchUsers();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callByNameMock.mockResolvedValue({ data: { users: [] } });
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserManagementDataAccessService);
  });

  it('asks the admin-only callable, not the open user search', async () => {
    await loadUsers([user()]);

    expect(callByNameMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'listUsersWithRoles' }),
    );
  });

  // Firebase returns accounts in uid order, which is arbitrary to the person
  // scanning the list for one of them.
  it('sorts accounts by email', async () => {
    const sorted = await loadUsers([
      user({ uid: 'u3', email: 'zoe@example.com' }),
      user({ uid: 'u1', email: 'ada@example.com' }),
      user({ uid: 'u2', email: 'mia@example.com' }),
    ]);

    expect(sorted.map((u) => u.email)).toEqual([
      'ada@example.com',
      'mia@example.com',
      'zoe@example.com',
    ]);
  });

  it('sorts an account with no email by its uid rather than ahead of everything', async () => {
    const sorted = await loadUsers([
      user({ uid: 'zzz', email: '' }),
      user({ uid: 'u1', email: 'ada@example.com' }),
    ]);

    expect(sorted.map((u) => u.uid)).toEqual(['u1', 'zzz']);
  });

  it('survives a response with no users array', async () => {
    callByNameMock.mockResolvedValue({ data: {} });

    await expect(service.fetchUsers()).resolves.toEqual([]);
  });

  // A search that silently covers only the first page answers "no such
  // account" for an account that exists (issue #1476).
  describe('paging', () => {
    const page = (
      users: AdminUser[],
      nextPageToken?: string,
    ): { data: { users: AdminUser[]; nextPageToken?: string } } => ({
      data: { users, ...(nextPageToken ? { nextPageToken } : {}) },
    });

    it('asks for the largest page the callable serves', async () => {
      await service.fetchUsers();

      expect(callByNameMock).toHaveBeenCalledWith({
        name: 'listUsersWithRoles',
        data: { limit: 1000 },
      });
    });

    it('follows the page token until there is none', async () => {
      callByNameMock
        .mockResolvedValueOnce(page([user({ uid: 'u1' })], 'second'))
        .mockResolvedValueOnce(page([user({ uid: 'u2' })], 'third'))
        .mockResolvedValueOnce(page([user({ uid: 'u3' })]));

      const users = await service.fetchUsers();

      expect(users.map((u) => u.uid)).toEqual(['u1', 'u2', 'u3']);
      expect(callByNameMock).toHaveBeenCalledTimes(3);
    });

    it('sends the token it was handed back', async () => {
      callByNameMock
        .mockResolvedValueOnce(page([user()], 'next'))
        .mockResolvedValueOnce(page([]));

      await service.fetchUsers();

      expect(callByNameMock).toHaveBeenLastCalledWith({
        name: 'listUsersWithRoles',
        data: { limit: 1000, pageToken: 'next' },
      });
    });

    // The loop is driven by a value the backend returns, so a token that never
    // stops coming back must not turn one page load into an endless sequence.
    it('stops after a bounded number of pages', async () => {
      callByNameMock.mockResolvedValue(page([user()], 'always-more'));

      await service.fetchUsers();

      expect(callByNameMock).toHaveBeenCalledTimes(20);
    });
  });

  // The page reloads after a save so the form shows what was stored rather than
  // what was submitted.
  it('exposes a reload that re-runs the resource', () => {
    const reload = jest.spyOn(service.users, 'reload');

    service.reload();

    expect(reload).toHaveBeenCalled();
  });

  it('writes roles through setUserRoles', async () => {
    callByNameMock.mockResolvedValue({ data: { uid: 'u1', roles: ['admin'] } });

    const result = await service.setRoles('u1', ['admin']);

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserRoles',
      data: { uid: 'u1', roles: ['admin'] },
    });
    expect(result).toEqual({ uid: 'u1', roles: ['admin'] });
  });

  // An empty list revokes; the callable replaces rather than merges.
  it('sends an empty role list through unchanged', async () => {
    callByNameMock.mockResolvedValue({ data: { uid: 'u1', roles: [] } });

    await service.setRoles('u1', []);

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserRoles',
      data: { uid: 'u1', roles: [] },
    });
  });

  it('writes the tier through its own callable, not through setUserRoles', async () => {
    callByNameMock.mockResolvedValue({
      data: { uid: 'u1', tier: 1, previousTier: 0 },
    });

    const result = await service.setSubscriptionTier('u1', 1, 'refund');

    expect(callByNameMock).toHaveBeenCalledWith({
      name: 'setUserSubscriptionTier',
      data: { uid: 'u1', tier: 1, reason: 'refund' },
    });
    expect(result).toEqual({ uid: 'u1', tier: 1, previousTier: 0 });
  });

  // `null` is "nobody decided", not Free, and it has to survive the trip.
  it('keeps an absent tier absent rather than reading it as Free', async () => {
    const [account] = await loadUsers([user({ subscriptionTier: null })]);

    expect(account.subscriptionTier).toBeNull();
  });
});
