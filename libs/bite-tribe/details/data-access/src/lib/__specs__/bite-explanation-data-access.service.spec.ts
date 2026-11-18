import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteExplanationDataAccessService } from '../bite-explanation-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

describe(BiteExplanationDataAccessService.name, () => {
  const service = new BiteExplanationDataAccessService();

  beforeEach(() => {
    jest.mocked(FirebaseFunctions.callByName).mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('asks explainBite for the Bite in the given language', async () => {
    const answer = {
      status: 'ok',
      cached: true,
      explanation: {
        whatItIs: 'A pounded papaya salad.',
        origin: 'Isan, Thailand.',
        ingredients: ['papaya', 'lime', 'chilli'],
      },
    };
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: answer,
    });

    await expect(service.explainBite('b1', 'tr')).resolves.toEqual(answer);
    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'explainBite',
      data: { biteId: 'b1', language: 'tr' },
    });
  });

  it('reads a failed call as unavailable', async () => {
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('offline'));

    await expect(service.explainBite('b1', 'tr')).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('reads an empty answer as unavailable', async () => {
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: undefined,
    } as never);

    await expect(service.explainBite('b1', 'tr')).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
