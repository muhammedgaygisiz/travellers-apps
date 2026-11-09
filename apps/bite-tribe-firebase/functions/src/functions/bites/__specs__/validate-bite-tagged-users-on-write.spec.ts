import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  arrayRemove,
  createFakeFirestore,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: {
    arrayRemove: (...values: unknown[]): unknown => arrayRemove(...values),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentWritten: jest.fn((_document, handler) => handler),
}));

const notifyTaggedUsers = jest.fn();

jest.mock('../../notifications/notify-tagged-users', () => ({
  notifyTaggedUsers: (...args: unknown[]): unknown =>
    notifyTaggedUsers(...args),
}));

import { validateBiteTaggedUsersOnWrite } from '../validate-bite-tagged-users-on-write';
import { MAX_TAGGED_USERS } from '../bite-tagged-users';

const CREATOR = 'creator-1';
const FRIEND = 'friend-1';
const OTHER_FRIEND = 'friend-2';
const BITE_PATH = 'bites/bite-1';

type Data = Record<string, unknown> | undefined;
type Handler = (event: unknown) => Promise<void>;

const handler = validateBiteTaggedUsersOnWrite as unknown as Handler;

/**
 * Runs the trigger for a write that took the Bite from `before` to `after`,
 * with `after` stored the way Firestore would have stored it already.
 */
const write = async (before: Data, after: Data): Promise<void> => {
  if (after) {
    db.seed(BITE_PATH, after);
  }

  await handler({
    params: { biteId: 'bite-1' },
    data: {
      before: { data: (): Data => before },
      after: { data: (): Data => after, ref: db.doc(BITE_PATH) },
    },
  });
};

const tagged = (): unknown => db.read(BITE_PATH)?.['taggedUserIds'];

/** A public account the creator follows: somebody the creator may tag. */
const seedTaggable = (uid: string): void => {
  db.seed(`users/${uid}`, { userId: uid, public: true });
  db.seed(`users/${CREATOR}/following/${uid}`, {});
};

const bite = (taggedUserIds?: unknown): Record<string, unknown> => ({
  userId: CREATOR,
  name: 'Ramen',
  ...(taggedUserIds === undefined ? {} : { taggedUserIds }),
});

describe('validateBiteTaggedUsersOnWrite', () => {
  let updateSpy: jest.SpyInstance;

  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${CREATOR}`, { userId: CREATOR, public: true });
    seedTaggable(FRIEND);
    seedTaggable(OTHER_FRIEND);
    updateSpy = jest.spyOn(
      Object.getPrototypeOf(db.doc(BITE_PATH)) as { update: () => unknown },
      'update',
    );
  });

  afterEach(() => updateSpy.mockRestore());

  it('keeps a valid list and writes nothing back', async () => {
    await write(undefined, bite([FRIEND, OTHER_FRIEND]));

    expect(tagged()).toEqual([FRIEND, OTHER_FRIEND]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('does nothing for a Bite without tagged users', async () => {
    await write(undefined, bite());

    expect(tagged()).toBeUndefined();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('removes an account the creator does not follow', async () => {
    db.seed('users/stranger', { userId: 'stranger', public: true });

    await write(undefined, bite([FRIEND, 'stranger']));

    expect(tagged()).toEqual([FRIEND]);
  });

  it('removes an account with a private profile', async () => {
    db.seed('users/private-1', { userId: 'private-1', public: false });
    db.seed(`users/${CREATOR}/following/private-1`, {});

    await write(undefined, bite(['private-1', FRIEND]));

    expect(tagged()).toEqual([FRIEND]);
  });

  it('removes an account that does not exist', async () => {
    db.seed(`users/${CREATOR}/following/ghost`, {});

    await write(undefined, bite(['ghost']));

    expect(tagged()).toEqual([]);
  });

  it('removes an account the creator blocked', async () => {
    db.seed(`users/${CREATOR}/blocked/${FRIEND}`, {});

    await write(undefined, bite([FRIEND, OTHER_FRIEND]));

    expect(tagged()).toEqual([OTHER_FRIEND]);
  });

  it('removes an account that blocked the creator', async () => {
    db.seed(`users/${CREATOR}/blockedBy/${FRIEND}`, {});

    await write(undefined, bite([FRIEND, OTHER_FRIEND]));

    expect(tagged()).toEqual([OTHER_FRIEND]);
  });

  it('removes a block edge from a tag the Bite already carried', async () => {
    db.seed(`users/${CREATOR}/blocked/${FRIEND}`, {});

    await write(bite([FRIEND]), bite([FRIEND, OTHER_FRIEND]));

    expect(tagged()).toEqual([OTHER_FRIEND]);
  });

  it('removes the creator and duplicates', async () => {
    await write(undefined, bite([FRIEND, CREATOR, FRIEND]));

    expect(tagged()).toEqual([FRIEND]);
  });

  it(`keeps at most ${MAX_TAGGED_USERS} tagged users`, async () => {
    const many = Array.from(
      { length: MAX_TAGGED_USERS + 2 },
      (_, index) => `friend-${index + 10}`,
    );
    many.forEach(seedTaggable);

    await write(undefined, bite(many));

    expect(tagged()).toEqual(many.slice(0, MAX_TAGGED_USERS));
  });

  /** Following and a public profile gate the act of tagging, not the tag. */
  it('keeps a tag whose user the creator unfollowed or who turned private', async () => {
    await db.doc(`users/${CREATOR}/following/${FRIEND}`).delete();
    db.seed(`users/${OTHER_FRIEND}`, { userId: OTHER_FRIEND, public: false });
    const newcomer = 'friend-3';
    seedTaggable(newcomer);

    await write(
      bite([FRIEND, OTHER_FRIEND]),
      bite([FRIEND, OTHER_FRIEND, newcomer]),
    );

    expect(tagged()).toEqual([FRIEND, OTHER_FRIEND, newcomer]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('does not re-read anything when the list did not change', async () => {
    db.seed(`users/${CREATOR}/blocked/${FRIEND}`, {});
    const getAllSpy = jest.spyOn(db, 'getAll');

    await write(
      { ...bite([FRIEND]), thumbup: 1 },
      { ...bite([FRIEND]), thumbup: 2 },
    );

    expect(getAllSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('settles after its own write instead of triggering itself again', async () => {
    db.seed('users/stranger', { userId: 'stranger', public: true });

    await write(undefined, bite([FRIEND, 'stranger']));
    expect(updateSpy).toHaveBeenCalledTimes(1);

    await write(bite([FRIEND, 'stranger']), bite([FRIEND]));
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(tagged()).toEqual([FRIEND]);
  });

  it('lets a Bite without a creator gain nobody', async () => {
    await write(
      { name: 'Ramen', taggedUserIds: [FRIEND] },
      { name: 'Ramen', taggedUserIds: [FRIEND, OTHER_FRIEND] },
    );

    expect(tagged()).toEqual([FRIEND]);
  });

  it('ignores a deleted Bite', async () => {
    await expect(write(bite([FRIEND]), undefined)).resolves.toBeUndefined();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

/** Issue #1919: who is told they were tagged. */
describe('validateBiteTaggedUsersOnWrite notifications', () => {
  const listable = (taggedUserIds?: unknown): Record<string, unknown> => ({
    ...bite(taggedUserIds),
    imageStatus: 'uploaded',
  });
  const pending = (taggedUserIds?: unknown): Record<string, unknown> => ({
    ...bite(taggedUserIds),
    imageStatus: 'pending',
  });
  const notified = (): string[][] =>
    notifyTaggedUsers.mock.calls.map((call) => call[3] as string[]);

  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${CREATOR}`, { userId: CREATOR, public: true });
    seedTaggable(FRIEND);
    seedTaggable(OTHER_FRIEND);
    notifyTaggedUsers.mockReset().mockResolvedValue(undefined);
  });

  it('tells each user a write to a listable Bite adds, once', async () => {
    await write(listable([FRIEND]), listable([FRIEND, OTHER_FRIEND]));

    expect(notified()).toEqual([[OTHER_FRIEND]]);
    expect(notifyTaggedUsers.mock.calls[0][1]).toBe('bite-1');
  });

  it('tells nobody when a re-save adds nobody', async () => {
    await write(listable([FRIEND, OTHER_FRIEND]), {
      ...listable([FRIEND, OTHER_FRIEND]),
      name: 'Ramen, renamed',
    });

    expect(notifyTaggedUsers).not.toHaveBeenCalled();
  });

  it('never tells a user the trigger removed', async () => {
    db.seed('users/stranger', { userId: 'stranger', public: true });

    await write(listable([FRIEND]), listable([FRIEND, 'stranger']));

    expect(notifyTaggedUsers).not.toHaveBeenCalled();
    expect(tagged()).toEqual([FRIEND]);
  });

  it('tells nobody until the photo has uploaded, then everybody valid', async () => {
    db.seed('users/stranger', { userId: 'stranger', public: true });

    await write(undefined, pending([FRIEND, OTHER_FRIEND]));
    expect(notifyTaggedUsers).not.toHaveBeenCalled();

    // The photo landed before the trigger had checked a stray uid.
    await write(
      pending([FRIEND, OTHER_FRIEND, 'stranger']),
      listable([FRIEND, OTHER_FRIEND, 'stranger']),
    );

    expect(notified()).toEqual([[FRIEND, OTHER_FRIEND]]);
  });

  it('tells the users of a Bite created listable', async () => {
    await write(undefined, listable([FRIEND]));

    expect(notified()).toEqual([[FRIEND]]);
  });

  it('does not tell anybody again when its own correction lands', async () => {
    db.seed('users/stranger', { userId: 'stranger', public: true });

    await write(listable([]), listable([FRIEND, 'stranger']));
    await write(listable([FRIEND, 'stranger']), listable([FRIEND]));

    expect(notified()).toEqual([[FRIEND]]);
  });
});
