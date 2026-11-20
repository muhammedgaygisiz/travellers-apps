import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { FollowRequestsDataAccessService } from 'bite-tribe/followers-data-access';
import type { PendingFollowRequest } from 'model';
import { ToastService } from 'toast';
import { FollowRequestsService } from '../follow-requests.service';

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

describe(FollowRequestsService.name, () => {
  let service: FollowRequestsService;
  let dataAccess: {
    requests: {
      isLoading: ReturnType<typeof signal<boolean>>;
      reload: jest.Mock;
    };
    requestsValue: ReturnType<typeof signal<PendingFollowRequest[]>>;
    requestsFailed: ReturnType<typeof signal<boolean>>;
    accept: jest.Mock;
    decline: jest.Mock;
  };
  let toast: { present: jest.Mock };
  let navController: { navigateForward: jest.Mock };

  beforeEach(() => {
    dataAccess = {
      requests: { isLoading: signal(false), reload: jest.fn() },
      requestsValue: signal([pia, quinn]),
      requestsFailed: signal(false),
      accept: jest.fn().mockResolvedValue(undefined),
      decline: jest.fn().mockResolvedValue(undefined),
    };
    toast = { present: jest.fn().mockResolvedValue(undefined) };
    navController = { navigateForward: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: FollowRequestsDataAccessService, useValue: dataAccess },
        { provide: ToastService, useValue: toast },
        { provide: NavController, useValue: navController },
      ],
    });

    service = TestBed.inject(FollowRequestsService);
  });

  it('drops an accepted request from the list', async () => {
    await service.accept(pia);

    expect(dataAccess.accept).toHaveBeenCalledWith('pia');
    expect(service.requests()).toEqual([quinn]);
    expect(service.answeringIds().size).toBe(0);
  });

  it('drops a declined request from the list', async () => {
    await service.decline(quinn);

    expect(dataAccess.decline).toHaveBeenCalledWith('quinn');
    expect(service.requests()).toEqual([pia]);
  });

  it('keeps the row and says so when the answer is refused', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    dataAccess.accept.mockRejectedValueOnce(new Error('not-found'));
    dataAccess.decline.mockRejectedValueOnce(new Error('unavailable'));

    await service.accept(pia);
    await service.decline(pia);

    expect(service.requests()).toEqual([pia, quinn]);
    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'follow-request-accept-failed',
      outcome: 'failure',
    });
    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'follow-request-decline-failed',
      outcome: 'failure',
    });
    expect(service.answeringIds().size).toBe(0);
  });

  it('sends one answer per request while it is on its way', async () => {
    let finish: () => void = () => undefined;
    dataAccess.accept.mockReturnValueOnce(
      new Promise<void>((resolve) => (finish = resolve)),
    );

    const first = service.accept(pia);
    expect(service.answeringIds().has('pia')).toBe(true);
    await service.decline(pia);
    finish();
    await first;

    expect(dataAccess.decline).not.toHaveBeenCalled();
    expect(dataAccess.accept).toHaveBeenCalledTimes(1);
  });

  it("opens the requester's profile", () => {
    service.requesterClicked(pia);

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'profile',
      'pia',
    ]);
  });

  it('reads the list again on every entry after the first', async () => {
    await service.accept(pia);

    service.enter();
    expect(dataAccess.requests.reload).not.toHaveBeenCalled();

    service.enter();
    expect(dataAccess.requests.reload).toHaveBeenCalledTimes(1);
    expect(service.requests()).toEqual([pia, quinn]);
  });
});
