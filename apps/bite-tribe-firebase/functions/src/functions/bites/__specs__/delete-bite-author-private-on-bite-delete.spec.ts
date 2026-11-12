import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentDeleted: jest.fn((_path, handler) => handler),
}));

import { deleteBiteAuthorPrivate } from '../delete-bite-author-private-on-bite-delete';

/** GitHub issue #1290: the photo's position must not outlive its Bite. */
describe('deleteBiteAuthorPrivate', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it("removes the author's private document of the deleted Bite", async () => {
    db.seed('bites/bite-1/authorPrivate/author-1', {
      userId: 'author-1',
      photoPosition: { latitude: 36.74, longitude: -5.16 },
    });

    await expect(deleteBiteAuthorPrivate('bite-1')).resolves.toBe(1);

    expect(db.exists('bites/bite-1/authorPrivate/author-1')).toBe(false);
  });

  it("leaves other Bites' private documents alone", async () => {
    db.seed('bites/bite-2/authorPrivate/author-1', {
      userId: 'author-1',
      photoPosition: { latitude: 47.0, longitude: 7.4 },
    });

    await expect(deleteBiteAuthorPrivate('bite-1')).resolves.toBe(0);

    expect(db.exists('bites/bite-2/authorPrivate/author-1')).toBe(true);
  });
});
