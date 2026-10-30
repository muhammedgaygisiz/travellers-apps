import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { preloadFirestoreWebPlugin } from '../preload-firestore-web-plugin';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { removeSnapshotListener: jest.fn() },
}));

const removeSnapshotListener =
  FirebaseFirestore.removeSnapshotListener as jest.Mock;

describe(preloadFirestoreWebPlugin.name, () => {
  beforeEach(() => {
    removeSnapshotListener.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the web implementation with a call that changes nothing', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    await preloadFirestoreWebPlugin();

    expect(removeSnapshotListener).toHaveBeenCalledWith({ callbackId: '' });
  });

  it('leaves native platforms alone', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    await preloadFirestoreWebPlugin();

    expect(removeSnapshotListener).not.toHaveBeenCalled();
  });

  it('never fails startup', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    jest.spyOn(console, 'warn').mockImplementation();
    removeSnapshotListener.mockRejectedValue(new Error('chunk failed'));

    await expect(preloadFirestoreWebPlugin()).resolves.toBeUndefined();
  });
});

/**
 * Why the preload exists, against the real `@capacitor/core`: a web plugin's
 * implementation is built once per call that arrives while the first load is
 * still in flight, so per-instance state such as a listener id counter splits.
 */
describe('Capacitor web plugin loading', () => {
  // `jest.requireActual` because this file mocks nothing of `@capacitor/core`,
  // but a later edit could; the race lives in the real loader.
  const { registerPlugin } =
    jest.requireActual<typeof import('@capacitor/core')>('@capacitor/core');

  /** A stand-in for a plugin that numbers listeners per instance. */
  class CountingWeb {
    private lastId = 0;

    async addListenerLike(): Promise<string> {
      return (++this.lastId).toString();
    }
  }

  type Counting = { addListenerLike(): Promise<string> };

  it('hands concurrent first calls instances of their own', async () => {
    const plugin = registerPlugin<Counting>('CountingRace', {
      web: async () => new CountingWeb(),
    });

    const ids = await Promise.all([
      plugin.addListenerLike(),
      plugin.addListenerLike(),
    ]);

    expect(ids).toEqual(['1', '1']);
  });

  it('shares one instance once a first call has been awaited', async () => {
    const plugin = registerPlugin<Counting>('CountingPreloaded', {
      web: async () => new CountingWeb(),
    });

    await plugin.addListenerLike();
    const ids = await Promise.all([
      plugin.addListenerLike(),
      plugin.addListenerLike(),
    ]);

    expect(ids).toEqual(['2', '3']);
  });
});
