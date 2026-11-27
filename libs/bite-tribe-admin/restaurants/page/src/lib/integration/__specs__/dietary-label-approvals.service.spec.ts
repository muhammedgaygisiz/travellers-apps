import { TestBed } from '@angular/core/testing';
import { DietaryLabelApprovalsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { DietaryLabelApprovalEntry } from 'model';
import { ToastService } from 'toast';
import { DietaryLabelApprovalsService } from '../dietary-label-approvals.service';

jest.mock('bite-tribe-admin/restaurants-data-access', () => ({
  DietaryLabelApprovalsDataAccessService: class {},
}));

jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class {},
}));

const QUEUE: DietaryLabelApprovalEntry[] = [
  {
    restaurantId: 'r1',
    restaurantName: 'Thai Garden',
    requestedAt: '2026-11-26T00:00:00.000Z',
    items: [
      { menuItemId: 'm1', name: 'Pad Thai', labels: ['vegan'], options: [] },
    ],
  },
];

const REQUEST = {
  restaurantId: 'r1',
  menuItemId: 'm1',
  label: 'vegan' as const,
  kind: 'label' as const,
  approve: true,
};

/** The operator's queue of dietary labels (GitHub issue #2198). */
describe(DietaryLabelApprovalsService.name, () => {
  let service: DietaryLabelApprovalsService;
  let list: jest.Mock;
  let answer: jest.Mock;
  let present: jest.Mock;
  let logout: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({ approvals: QUEUE });
    answer = jest.fn().mockResolvedValue({ status: 'approved' });
    present = jest.fn().mockResolvedValue(undefined);
    logout = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        DietaryLabelApprovalsService,
        {
          provide: DietaryLabelApprovalsDataAccessService,
          useValue: { list, answer },
        },
        { provide: BiteTribeStoreService, useValue: { logout } },
        { provide: ToastService, useValue: { present } },
      ],
    });

    service = TestBed.inject(DietaryLabelApprovalsService);
  });

  it('loads the queue', async () => {
    await service.load();

    expect(service.approvals()).toEqual(QUEUE);
    expect(service.loading()).toBe(false);
    expect(service.failed()).toBe(false);
  });

  it('says a failed load failed rather than showing an empty queue', async () => {
    list.mockRejectedValue(new Error('unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.load();

    expect(service.approvals()).toEqual([]);
    expect(service.failed()).toBe(true);
  });

  it.each(['approved', 'refused', 'gone'])(
    'answers a label, says it was %s and reads the queue again',
    async (status) => {
      answer.mockResolvedValue({ status });

      await service.answer(REQUEST);

      expect(answer).toHaveBeenCalledWith(REQUEST);
      expect(present).toHaveBeenCalledWith({
        messageKey: `admin-dietary-approval-${status}`,
        outcome: 'success',
      });
      expect(list).toHaveBeenCalledTimes(1);
      expect(service.answering()).toBeUndefined();
    },
  );

  it('says when an answer could not be saved', async () => {
    answer.mockRejectedValue(new Error('permission-denied'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.answer(REQUEST);

    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-dietary-approval-failed',
      outcome: 'failure',
    });
    expect(list).not.toHaveBeenCalled();
  });

  it('answers one label at a time', async () => {
    let finish: (value: unknown) => void = () => undefined;
    answer.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const first = service.answer(REQUEST);
    expect(service.answering()).toBe('r1/m1/label/vegan');
    await service.answer({ ...REQUEST, approve: false });
    finish({ status: 'approved' });
    await first;

    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('logs out through the store', () => {
    service.logout();

    expect(logout).toHaveBeenCalled();
  });
});
