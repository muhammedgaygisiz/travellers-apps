import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  loadDisplayNameById,
  loadDisplayNamesById,
} from '../load-display-names-by-id';

jest.mock('@capacitor-firebase/firestore');

const profiles: Record<string, Record<string, unknown> | null> = {};

const mockProfiles = (): void => {
  (FirebaseFirestore.getDocument as jest.Mock).mockImplementation(
    async ({ reference }: { reference: string }) => ({
      snapshot: {
        data: profiles[reference.split('/').pop() as string] ?? null,
      },
    }),
  );
};

describe('loadDisplayNamesById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(profiles).forEach((key) => delete profiles[key]);
    mockProfiles();
  });

  it('reads the display name off the profile document', async () => {
    profiles['mo'] = { userId: 'mo', displayName: 'Mo', fullName: 'Muhammed' };

    await expect(loadDisplayNamesById(['mo'])).resolves.toEqual(
      new Map([['mo', 'Mo']]),
    );
    expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
      reference: 'users/mo',
    });
  });

  it('reads one profile per author however many times the author wrote', async () => {
    profiles['mo'] = { displayName: 'Mo' };

    await loadDisplayNamesById(['mo', 'mo', 'mo']);

    expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(1);
  });

  it('leaves out an author whose profile does not exist', async () => {
    profiles['mira'] = { displayName: 'Mira' };

    await expect(loadDisplayNamesById(['mira', 'deleted'])).resolves.toEqual(
      new Map([['mira', 'Mira']]),
    );
  });

  it('leaves out an author whose profile carries no usable display name', async () => {
    profiles['blank'] = { displayName: '   ' };
    profiles['missing'] = { userId: 'missing' };

    await expect(loadDisplayNamesById(['blank', 'missing'])).resolves.toEqual(
      new Map(),
    );
  });

  it('ignores an empty uid rather than reading a collection', async () => {
    await expect(loadDisplayNamesById(['', ''])).resolves.toEqual(new Map());
    expect(FirebaseFirestore.getDocument).not.toHaveBeenCalled();
  });
});

describe('loadDisplayNameById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(profiles).forEach((key) => delete profiles[key]);
    mockProfiles();
  });

  it('returns the display name of the account', async () => {
    profiles['mo'] = { displayName: 'Mo' };

    await expect(loadDisplayNameById('mo')).resolves.toBe('Mo');
  });

  // One unreadable profile costs one name, not the whole compartment.
  it('reports nothing when the profile cannot be read', async () => {
    (FirebaseFirestore.getDocument as jest.Mock).mockRejectedValue(
      new Error('permission-denied'),
    );
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await expect(loadDisplayNameById('mo')).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
