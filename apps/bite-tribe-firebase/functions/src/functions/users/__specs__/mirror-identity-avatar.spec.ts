const saveMock = jest.fn().mockResolvedValue(undefined);
const fileMock = jest.fn(() => ({ save: saveMock }));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: fileMock })) })),
}));

const deleteDocMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn(() => ({ delete: deleteDocMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: collectionMock })),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_path, handler) => handler),
}));

import {
  isMirroredAvatarUrl,
  mirrorIdentityAvatar,
  mirrorIdentityAvatarOnCreate,
} from '../mirror-identity-avatar';
import { MAX_CHECKED_IMAGE_BYTES } from '../../shared/moderation/check-image';

const AVATAR_URL = 'https://lh3.googleusercontent.com/a/avatar=s96-c';

const handler = mirrorIdentityAvatarOnCreate as unknown as (event: {
  params: { uid: string };
  data?: { data: () => Record<string, unknown> | undefined };
}) => Promise<void>;

const answer = (
  body: Uint8Array,
  contentType = 'image/jpeg',
  status = 200,
): Response =>
  new Response(body, { status, headers: { 'content-type': contentType } });

describe('mirrorIdentityAvatar', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(answer(new Uint8Array([1, 2, 3])));
  });

  it('uploads the avatar into the account photo folder, where it is checked', async () => {
    await mirrorIdentityAvatar('user-1', AVATAR_URL);

    expect(fetchMock).toHaveBeenCalledWith(AVATAR_URL, expect.anything());
    expect(fileMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^images\/users\/user-1\/identity-avatar-\d+\.jpg$/,
      ),
    );
    expect(saveMock).toHaveBeenCalledWith(Buffer.from([1, 2, 3]), {
      contentType: 'image/jpeg',
      metadata: {
        metadata: { firebaseStorageDownloadTokens: expect.any(String) },
      },
    });
  });

  it.each([
    'http://lh3.googleusercontent.com/a/avatar',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://evil.example/googleusercontent.com/a.jpg',
    'not a url',
  ])('never fetches an avatar off the provider host: %s', async (url) => {
    await mirrorIdentityAvatar('user-1', url);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('drops an avatar the provider does not serve', async () => {
    fetchMock.mockResolvedValue(answer(new Uint8Array([1]), 'image/jpeg', 404));

    await mirrorIdentityAvatar('user-1', AVATAR_URL);

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('drops an answer that is not an image', async () => {
    fetchMock.mockResolvedValue(answer(new Uint8Array([1]), 'text/html'));

    await mirrorIdentityAvatar('user-1', AVATAR_URL);

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('drops an avatar larger than the check accepts', async () => {
    fetchMock.mockResolvedValue(
      answer(new Uint8Array(MAX_CHECKED_IMAGE_BYTES + 1)),
    );

    await mirrorIdentityAvatar('user-1', AVATAR_URL);

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('removes the queued entry once it is mirrored', async () => {
    await handler({
      params: { uid: 'user-1' },
      data: { data: () => ({ sourceUrl: AVATAR_URL }) },
    });

    expect(saveMock).toHaveBeenCalled();
    expect(collectionMock).toHaveBeenCalledWith('identityAvatars');
    expect(docMock).toHaveBeenCalledWith('user-1');
    expect(deleteDocMock).toHaveBeenCalled();
  });

  it('removes the queued entry when the fetch fails, leaving no photo', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    await handler({
      params: { uid: 'user-1' },
      data: { data: () => ({ sourceUrl: AVATAR_URL }) },
    });

    expect(saveMock).not.toHaveBeenCalled();
    expect(deleteDocMock).toHaveBeenCalled();
  });
});

describe('isMirroredAvatarUrl', () => {
  it('accepts Google avatar hosts over HTTPS only', () => {
    expect(isMirroredAvatarUrl(AVATAR_URL)).toBe(true);
    expect(isMirroredAvatarUrl('https://googleusercontent.com/a')).toBe(true);
    expect(isMirroredAvatarUrl('https://example.com/a.jpg')).toBe(false);
    expect(isMirroredAvatarUrl('')).toBe(false);
  });
});
