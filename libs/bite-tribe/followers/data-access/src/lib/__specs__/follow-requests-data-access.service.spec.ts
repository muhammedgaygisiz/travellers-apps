import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ProfileApiService } from 'bite-tribe/api';
import type { PendingFollowRequest } from 'model';
import { FollowRequestsDataAccessService } from '../follow-requests-data-access.service';

const pia: PendingFollowRequest = {
  requesterUid: 'pia',
  displayName: 'Pia',
  createdAt: '2026-11-19T10:00:00.000Z',
};
const quinn: PendingFollowRequest = {
  requesterUid: 'quinn',
  displayName: 'Quinn',
  createdAt: '2026-11-18T10:00:00.000Z',
};

describe(FollowRequestsDataAccessService.name, () => {
  let userId$: BehaviorSubject<string>;
  let blockedUserIds$: BehaviorSubject<string[]>;
  let api: {
    listFollowRequests: jest.Mock;
    acceptFollowRequest: jest.Mock;
    declineFollowRequest: jest.Mock;
  };

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };

  beforeEach(() => {
    userId$ = new BehaviorSubject('owner');
    blockedUserIds$ = new BehaviorSubject<string[]>([]);
    api = {
      listFollowRequests: jest.fn().mockResolvedValue([pia, quinn]),
      acceptFollowRequest: jest.fn().mockResolvedValue({ accepted: true }),
      declineFollowRequest: jest.fn().mockResolvedValue({ declined: true }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileApiService, useValue: api },
        {
          provide: BiteTribeStoreService,
          useValue: { userId$, blockedUserIds$ },
        },
      ],
    });
  });

  it('reads the pending requests once signed in', async () => {
    const service = TestBed.inject(FollowRequestsDataAccessService);

    await settle();

    expect(api.listFollowRequests).toHaveBeenCalledTimes(1);
    expect(service.requestsValue()).toEqual([pia, quinn]);
    expect(service.requestsFailed()).toBe(false);
  });

  it('reads nothing while signed out', async () => {
    userId$.next('');
    const service = TestBed.inject(FollowRequestsDataAccessService);

    await settle();

    expect(api.listFollowRequests).not.toHaveBeenCalled();
    expect(service.requestsValue()).toEqual([]);
  });

  it('drops a requester blocked while the list was held', async () => {
    const service = TestBed.inject(FollowRequestsDataAccessService);
    await settle();

    blockedUserIds$.next(['pia']);

    expect(service.requestsValue()).toEqual([quinn]);
  });

  it('reports a read that failed', async () => {
    api.listFollowRequests.mockRejectedValue(new Error('unavailable'));
    const service = TestBed.inject(FollowRequestsDataAccessService);

    await settle();

    expect(service.requestsFailed()).toBe(true);
    expect(service.requestsValue()).toEqual([]);
  });

  it('accepts and declines through the API', async () => {
    const service = TestBed.inject(FollowRequestsDataAccessService);

    await service.accept('pia');
    await service.decline('quinn');

    expect(api.acceptFollowRequest).toHaveBeenCalledWith('pia');
    expect(api.declineFollowRequest).toHaveBeenCalledWith('quinn');
  });
});
