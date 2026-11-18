import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore, DELETE_SENTINEL } from './fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: (): unknown => DELETE_SENTINEL },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (options: unknown, handler?: unknown) => handler ?? options,
  ),
}));

jest.mock('../../shared/utils/deployment-stage', () => ({
  resolveDeploymentStage: (): string => 'dev',
}));

jest.mock('../../shared/moderation/content-refusal', () => ({
  recordContentRefusal: jest.fn(),
}));

import { CallableRequest } from 'firebase-functions/https';
import { recordContentRefusal } from '../../shared/moderation/content-refusal';
import {
  updateProfileTextHandler,
  UpdateProfileTextRequest,
} from '../update-profile-text';

const UID = 'user-1';

const as = (
  data: UpdateProfileTextRequest,
): CallableRequest<UpdateProfileTextRequest> =>
  ({
    auth: { uid: UID, token: { firebase: { sign_in_provider: 'password' } } },
    data,
  }) as unknown as CallableRequest<UpdateProfileTextRequest>;

describe('updateProfileText', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${UID}`, {
      displayName: 'ana',
      fullName: 'Ana',
      pronouns: 'she/her',
      public: true,
    });
    (recordContentRefusal as jest.Mock).mockClear();
  });

  it('writes the four text fields trimmed and leaves the rest of the profile', async () => {
    await expect(
      updateProfileTextHandler(
        as({
          fullName: ' Ana Lima ',
          city: 'Lisbon',
          about: 'Eats',
          pronouns: 'she/they',
        }),
      ),
    ).resolves.toEqual({ status: 'saved' });

    expect(db.read(`users/${UID}`)).toEqual({
      displayName: 'ana',
      fullName: 'Ana Lima',
      city: 'Lisbon',
      about: 'Eats',
      pronouns: 'she/they',
      public: true,
      updatedAt: expect.any(String),
      updatedAtTimestamp: expect.any(Number),
    });
  });

  it('removes pronouns that are cleared rather than storing an empty string', async () => {
    await updateProfileTextHandler(as({ fullName: 'Ana', pronouns: '  ' }));

    expect(db.read(`users/${UID}`)).not.toHaveProperty('pronouns');
  });

  it('refuses objectionable text in any field, writes nothing and names the field', async () => {
    await expect(
      updateProfileTextHandler(as({ fullName: 'Ana', pronouns: 'cunt' })),
    ).resolves.toEqual({ status: 'refused', field: 'pronouns' });

    expect(db.read(`users/${UID}`)?.['pronouns']).toBe('she/her');
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ uid: UID, surface: 'profile' }),
    );
  });

  it('rejects pronouns over 40 characters and text that is not a string', async () => {
    await expect(
      updateProfileTextHandler(as({ pronouns: 'x'.repeat(41) })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      updateProfileTextHandler(as({ city: 42 })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
