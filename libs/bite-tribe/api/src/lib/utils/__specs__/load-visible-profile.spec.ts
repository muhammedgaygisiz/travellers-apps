import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  isRefusedRead,
  loadVisibleProfile,
  privateProfileStandIn,
} from '../load-visible-profile';

describe('loadVisibleProfile (issue #1863)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a public profile whole, with its uid', async () => {
    const getDocument = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({
        snapshot: { id: 'u1', data: { displayName: 'Mo', public: true } },
      } as never);

    await expect(loadVisibleProfile('u1')).resolves.toEqual({
      userId: 'u1',
      displayName: 'Mo',
      public: true,
    });
    expect(getDocument).toHaveBeenCalledWith({ reference: 'users/u1' });
  });

  it('returns nothing for a profile that does not exist', async () => {
    jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({ snapshot: { id: 'u1', data: null } } as never);

    await expect(loadVisibleProfile('u1')).resolves.toBeUndefined();
  });

  it('returns the stand-in for a private profile the rules refuse', async () => {
    jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockRejectedValue({ code: 'permission-denied', message: 'denied' });

    await expect(loadVisibleProfile('u1')).resolves.toEqual(
      privateProfileStandIn('u1'),
    );
  });

  it('leaves any other failure to the caller', async () => {
    const offline = new Error(
      'Failed to get document because the client is offline.',
    );
    jest.spyOn(FirebaseFirestore, 'getDocument').mockRejectedValue(offline);

    await expect(loadVisibleProfile('u1')).rejects.toBe(offline);
  });
});

describe('isRefusedRead', () => {
  it.each([
    [{ code: 'permission-denied' }],
    [new Error('PERMISSION_DENIED: Missing or insufficient permissions.')],
    [new Error('Missing or insufficient permissions.')],
  ])('recognises %p as a refusal', (error) => {
    expect(isRefusedRead(error)).toBe(true);
  });

  it.each([[new Error('unavailable')], [null], ['offline']])(
    'does not mistake %p for one',
    (error) => {
      expect(isRefusedRead(error)).toBe(false);
    },
  );
});
