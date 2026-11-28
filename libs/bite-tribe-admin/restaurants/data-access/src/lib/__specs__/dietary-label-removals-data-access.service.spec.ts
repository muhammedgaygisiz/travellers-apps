import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { DietaryLabelRemovalsDataAccessService } from '../dietary-label-removals-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;

/** The calls behind the removed dietary label queue (GitHub issue #2199). */
describe(DietaryLabelRemovalsDataAccessService.name, () => {
  let service: DietaryLabelRemovalsDataAccessService;

  beforeEach(() => {
    callByName.mockReset();
    service = TestBed.inject(DietaryLabelRemovalsDataAccessService);
  });

  it('lists the queue, and reads no answer as an empty one', async () => {
    callByName.mockResolvedValueOnce({
      data: { removals: [{ removalId: 'r1__m1__vegan' }] },
    });
    await expect(service.list()).resolves.toEqual({
      removals: [{ removalId: 'r1__m1__vegan' }],
    });
    expect(callByName).toHaveBeenCalledWith({
      name: 'listDietaryLabelRemovals',
    });

    callByName.mockResolvedValueOnce({ data: undefined });
    await expect(service.list()).resolves.toEqual({ removals: [] });
  });

  it('sends a decision and returns what became of it', async () => {
    const request = {
      removalId: 'r1__m1__vegan',
      decision: 'restore' as const,
      reason: 'Brigading',
    };
    callByName.mockResolvedValue({ data: { status: 'restored' } });

    await expect(service.answer(request)).resolves.toEqual({
      status: 'restored',
    });
    expect(callByName).toHaveBeenCalledWith({
      name: 'answerDietaryLabelRemoval',
      data: request,
    });
  });
});
