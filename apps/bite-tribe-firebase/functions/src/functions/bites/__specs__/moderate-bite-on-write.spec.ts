import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  createFakeFirestore,
  DELETE_SENTINEL,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: (): unknown => DELETE_SENTINEL },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentWritten: jest.fn((_options: unknown, handler: unknown) => handler),
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

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: jest.fn(async () => 1),
}));

jest.mock('../delete-bite-as-operator', () => ({
  deleteLikesForBite: jest.fn(async () => 0),
  deleteReviewsForBite: jest.fn(async () => 0),
  deleteImagesForBite: jest.fn(async () => []),
  removeBiteFromRestaurantCandidates: jest.fn(async () => 0),
  removeBiteFromBucketlists: jest.fn(async () => 0),
  removeBiteFromBiteTrails: jest.fn(async () => 0),
}));

import { CallableRequest } from 'firebase-functions/https';
import { recordContentRefusal } from '../../shared/moderation/content-refusal';
import { sendLocalizedNotification } from '../../shared/utils/send-localized-notification';
import { biteContentChanged } from '../bite-content';
import {
  checkBiteContentHandler,
  CheckBiteContentRequest,
} from '../check-bite-content';
import { deleteImagesForBite } from '../delete-bite-as-operator';
import {
  BITE_CONTENT_REFUSED_TYPE,
  moderateBiteOnWrite,
} from '../moderate-bite-on-write';

type Doc = Record<string, unknown>;

const trigger = moderateBiteOnWrite as unknown as (
  event: unknown,
) => Promise<void>;

const write = (before: Doc | undefined, after: Doc | undefined): unknown => ({
  params: { biteId: 'bite-1' },
  data: {
    before: { data: (): Doc | undefined => before },
    after: { data: (): Doc | undefined => after },
  },
});

const OWNER = 'owner-uid';
const ALLOWED: Doc = {
  userId: OWNER,
  name: 'Ramen',
  tags: ['noodles'],
  description: 'Rich broth',
};
const REFUSED_NAME = 'cunt ramen';

describe('biteContentChanged', () => {
  it('sees a new Bite and a changed name, tag or description', () => {
    expect(biteContentChanged(undefined, ALLOWED)).toBe(true);
    expect(biteContentChanged(ALLOWED, { ...ALLOWED, name: 'Pho' })).toBe(true);
    expect(biteContentChanged(ALLOWED, { ...ALLOWED, tags: ['soup'] })).toBe(
      true,
    );
    expect(
      biteContentChanged(ALLOWED, { ...ALLOWED, description: 'Thin' }),
    ).toBe(true);
  });

  it('ignores writes that leave the text alone, and a delete', () => {
    expect(biteContentChanged(ALLOWED, { ...ALLOWED, thumbup: 3 })).toBe(false);
    expect(biteContentChanged(ALLOWED, undefined)).toBe(false);
  });
});

describe('moderateBiteOnWrite', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    jest.clearAllMocks();
  });

  it('leaves an allowed Bite alone', async () => {
    db.seed('bites/bite-1', ALLOWED);

    await trigger(write(undefined, ALLOWED));

    expect(db.read('bites/bite-1')).toEqual(ALLOWED);
    expect(recordContentRefusal).not.toHaveBeenCalled();
  });

  it('puts the previous text back on a refused edit, and tells the author', async () => {
    const edited = {
      ...ALLOWED,
      name: REFUSED_NAME,
      tags: ['x'],
      description: 'y',
    };
    db.seed('bites/bite-1', edited);

    await trigger(write(ALLOWED, edited));

    expect(db.read('bites/bite-1')).toEqual(ALLOWED);
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: OWNER,
        surface: 'bite',
        stage: 'trigger',
        action: 'reverted',
        targetId: 'bite-1',
      }),
    );
    expect(sendLocalizedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uids: [OWNER],
        data: { type: BITE_CONTENT_REFUSED_TYPE, biteId: 'bite-1' },
      }),
    );
  });

  it('removes tags and description the Bite did not have before a refused edit', async () => {
    const before = { userId: OWNER, name: 'Ramen' };
    const edited = { ...before, tags: ['cunt'], description: 'nice' };
    db.seed('bites/bite-1', edited);

    await trigger(write(before, edited));

    expect(db.read('bites/bite-1')).toEqual(before);
  });

  it('removes a refused new Bite with what was attached to it', async () => {
    const created = { ...ALLOWED, name: REFUSED_NAME };
    db.seed('bites/bite-1', created);

    await trigger(write(undefined, created));

    expect(db.exists('bites/bite-1')).toBe(false);
    expect(deleteImagesForBite).toHaveBeenCalledWith('bite-1', created);
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted' }),
    );
    expect(sendLocalizedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ data: { type: BITE_CONTENT_REFUSED_TYPE } }),
    );
  });

  it('does not check a write that left the text alone', async () => {
    const liked = { ...ALLOWED, name: REFUSED_NAME, thumbup: 1 };

    await trigger(write({ ...liked, thumbup: 0 }, liked));

    expect(recordContentRefusal).not.toHaveBeenCalled();
  });
});

describe('checkBiteContent', () => {
  const as = (
    data: CheckBiteContentRequest,
  ): CallableRequest<CheckBiteContentRequest> =>
    ({
      auth: {
        uid: OWNER,
        token: { firebase: { sign_in_provider: 'password' } },
      },
      data,
    }) as unknown as CallableRequest<CheckBiteContentRequest>;

  beforeEach(() => {
    db = createFakeFirestore();
    jest.clearAllMocks();
  });

  it('allows a Bite whose text passes', async () => {
    await expect(checkBiteContentHandler(as(ALLOWED))).resolves.toEqual({
      status: 'allowed',
    });
    expect(recordContentRefusal).not.toHaveBeenCalled();
  });

  it('refuses objectionable text, names the field and records the attempt', async () => {
    await expect(
      checkBiteContentHandler(
        as({ name: 'Ramen', tags: ['cunt'], biteId: 'b' }),
      ),
    ).resolves.toEqual({ status: 'refused', field: 'tags' });
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'precheck', targetId: 'b' }),
    );
  });
});
