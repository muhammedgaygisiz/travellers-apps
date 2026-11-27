import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { DietaryLabelApprovalsDataAccessService } from '../dietary-label-approvals-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;

/** The calls behind the dietary label queue (GitHub issue #2198). */
describe(DietaryLabelApprovalsDataAccessService.name, () => {
  let service: DietaryLabelApprovalsDataAccessService;

  beforeEach(() => {
    callByName.mockReset();
    service = TestBed.inject(DietaryLabelApprovalsDataAccessService);
  });

  it('lists the queue, and reads no answer as an empty one', async () => {
    callByName.mockResolvedValueOnce({
      data: { approvals: [{ restaurantId: 'r1' }] },
    });
    await expect(service.list()).resolves.toEqual({
      approvals: [{ restaurantId: 'r1' }],
    });
    expect(callByName).toHaveBeenCalledWith({
      name: 'listDietaryLabelApprovals',
    });

    callByName.mockResolvedValueOnce({ data: undefined });
    await expect(service.list()).resolves.toEqual({ approvals: [] });
  });

  it('sends an answer and returns what became of it', async () => {
    const request = {
      restaurantId: 'r1',
      menuItemId: 'm1',
      label: 'vegan' as const,
      kind: 'label' as const,
      approve: true,
    };
    callByName.mockResolvedValue({ data: { status: 'approved' } });

    await expect(service.answer(request)).resolves.toEqual({
      status: 'approved',
    });
    expect(callByName).toHaveBeenCalledWith({
      name: 'answerDietaryLabelApproval',
      data: request,
    });
  });
});
