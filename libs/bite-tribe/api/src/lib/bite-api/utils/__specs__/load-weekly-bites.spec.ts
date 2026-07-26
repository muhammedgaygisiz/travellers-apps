import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { WeeklyBites } from 'model';
import { loadWeeklyBites } from '../load-weekly-bites';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

const WEEK = {
  weekStart: 1752444000000,
  weekEnd: 1753048799999,
};

const RESPONSE: WeeklyBites = {
  ...WEEK,
  bites: [{ id: 'bite-1' }],
} as WeeklyBites;

describe('loadWeeklyBites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: RESPONSE,
    });
  });

  it('should ask the backend for the requested week', async () => {
    const result = await loadWeeklyBites(WEEK);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadWeeklyBites',
      data: WEEK,
    });
    expect(result).toEqual(RESPONSE);
  });

  it('should ask without bounds when no week is given', async () => {
    // The backend then answers with the previous calendar week, which is the
    // week the latest summary notification counted.
    await loadWeeklyBites();

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadWeeklyBites',
      data: { weekStart: undefined, weekEnd: undefined },
    });
  });

  it('should resolve to undefined when the call fails', async () => {
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('Function failed'));

    await expect(loadWeeklyBites(WEEK)).resolves.toBeUndefined();
  });
});
