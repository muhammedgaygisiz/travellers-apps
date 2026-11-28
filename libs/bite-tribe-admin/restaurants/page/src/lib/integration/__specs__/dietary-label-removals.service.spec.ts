import { TestBed } from '@angular/core/testing';
import { DietaryLabelRemovalsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { DietaryLabelRemovalEntry } from 'model';
import { ToastService } from 'toast';
import { DietaryLabelRemovalsService } from '../dietary-label-removals.service';

jest.mock('bite-tribe-admin/restaurants-data-access', () => ({
  DietaryLabelRemovalsDataAccessService: class {},
}));

jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class {},
}));

const QUEUE = [
  { removalId: 'r1__m1__vegan', label: 'vegan' },
] as unknown as DietaryLabelRemovalEntry[];

const REQUEST = {
  removalId: 'r1__m1__vegan',
  decision: 'restore' as const,
  reason: 'Brigading',
};

/** The operator's queue of removed dietary labels (GitHub issue #2199). */
describe(DietaryLabelRemovalsService.name, () => {
  let service: DietaryLabelRemovalsService;
  let list: jest.Mock;
  let answer: jest.Mock;
  let present: jest.Mock;
  let logout: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({ removals: QUEUE });
    answer = jest.fn().mockResolvedValue({ status: 'restored' });
    present = jest.fn().mockResolvedValue(undefined);
    logout = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        DietaryLabelRemovalsService,
        {
          provide: DietaryLabelRemovalsDataAccessService,
          useValue: { list, answer },
        },
        { provide: BiteTribeStoreService, useValue: { logout } },
        { provide: ToastService, useValue: { present } },
      ],
    });

    service = TestBed.inject(DietaryLabelRemovalsService);
  });

  it('loads the queue', async () => {
    await service.load();

    expect(service.removals()).toEqual(QUEUE);
    expect(service.failed()).toBe(false);
  });

  it('says a failed load failed rather than showing an empty queue', async () => {
    list.mockRejectedValue(new Error('unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.load();

    expect(service.removals()).toEqual([]);
    expect(service.failed()).toBe(true);
  });

  it.each(['restored', 'confirmed', 'gone'])(
    'decides, says it was %s and reads the queue again',
    async (status) => {
      answer.mockResolvedValue({ status });

      await service.answer(REQUEST);

      expect(answer).toHaveBeenCalledWith(REQUEST);
      expect(present).toHaveBeenCalledWith({
        messageKey: `admin-dietary-removal-${status}`,
        outcome: 'success',
      });
      expect(list).toHaveBeenCalledTimes(1);
      expect(service.answering()).toBeUndefined();
    },
  );

  it('says when a decision could not be saved', async () => {
    answer.mockRejectedValue(new Error('permission-denied'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.answer(REQUEST);

    expect(present).toHaveBeenCalledWith({
      messageKey: 'admin-dietary-removal-failed',
      outcome: 'failure',
    });
  });

  it('decides one removal at a time', async () => {
    let finish: (value: unknown) => void = () => undefined;
    answer.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const first = service.answer(REQUEST);
    expect(service.answering()).toBe('r1__m1__vegan');
    await service.answer({ ...REQUEST, decision: 'confirm' });
    finish({ status: 'restored' });
    await first;

    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('logs out through the store', () => {
    service.logout();

    expect(logout).toHaveBeenCalled();
  });
});
