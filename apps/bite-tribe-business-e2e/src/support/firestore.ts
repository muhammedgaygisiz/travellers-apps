import { expect, Page } from '@playwright/test';

/**
 * Firestore emulator REST endpoint. `Bearer owner` is the emulator's
 * rules-bypassing owner credential, so fixtures can be written and read back
 * without going through the app.
 */
export const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

export const seedFirestoreDocument = async (
  page: Page,
  documentPath: string,
  fields: Record<string, unknown>,
): Promise<void> => {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/${documentPath}`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: { fields },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
};

/**
 * Removes a seeded document again. The emulator keeps every write for the whole
 * run, so a spec whose fixtures would otherwise stay visible to later specs (a
 * restaurant in the shared business dashboard list, say) can hand them back here.
 */
export const deleteFirestoreDocument = async (
  page: Page,
  documentPath: string,
): Promise<void> => {
  const response = await page.request.delete(
    `${FIRESTORE_EMULATOR_URL}/${documentPath}`,
    { headers: { Authorization: 'Bearer owner' } },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
};

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

const decodeValue = (value: FirestoreValue): unknown => {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values ?? []).map(decodeValue);
  }
  if (value.mapValue !== undefined) {
    return decodeFields(value.mapValue.fields ?? {});
  }
  return undefined;
};

const decodeFields = (
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );

export const getFirestoreDocument = async (
  page: Page,
  documentPath: string,
): Promise<Record<string, unknown> | undefined> => {
  const response = await page.request.get(
    `${FIRESTORE_EMULATOR_URL}/${documentPath}`,
    { headers: { Authorization: 'Bearer owner' } },
  );

  if (response.status() === 404) return undefined;
  if (!response.ok()) throw new Error(await response.text());

  const document = (await response.json()) as FirestoreDocument;
  return decodeFields(document.fields ?? {});
};

export const expectFirestoreDocument = async (
  page: Page,
  documentPath: string,
  fields: Record<string, unknown>,
): Promise<void> => {
  await expect
    .poll(() => getFirestoreDocument(page, documentPath), { timeout: 15_000 })
    .toMatchObject(fields);
};

/** One document of a collection listing: its id and its decoded fields. */
export interface FirestoreCollectionEntry {
  id: string;
  fields: Record<string, unknown>;
}

/**
 * Every document of one collection, ids included.
 *
 * The floor plan is the first business journey whose result is a *set* of
 * documents rather than one known path: a table's id is a uuid the editor
 * mints, so a spec that placed two tables cannot name them and has to read
 * them back by collection. The emulator's REST `list` answers with an object
 * holding no `documents` key at all when the collection is empty, which is why
 * the fallback is `[]` rather than a length check on a missing array.
 */
export const listFirestoreDocuments = async (
  page: Page,
  collectionPath: string,
): Promise<FirestoreCollectionEntry[]> => {
  const response = await page.request.get(
    `${FIRESTORE_EMULATOR_URL}/${collectionPath}`,
    { headers: { Authorization: 'Bearer owner' } },
  );

  if (!response.ok()) throw new Error(await response.text());

  const listing = (await response.json()) as {
    documents?: FirestoreDocument[];
  };

  return (listing.documents ?? []).map((document) => ({
    id: document.name.split('/').pop() ?? '',
    fields: decodeFields(document.fields ?? {}),
  }));
};

/**
 * Waits until a collection holds `count` documents, and answers with them.
 *
 * A publish writes the room, then one document per table, then deletes the
 * draft, so reading the tables the moment the success toast appears can catch
 * the collection mid-write. Polling for the expected count is what makes the
 * assertions that follow about the plan rather than about the timing.
 */
export const expectFirestoreCollection = async (
  page: Page,
  collectionPath: string,
  count: number,
): Promise<FirestoreCollectionEntry[]> => {
  await expect
    .poll(
      async () => (await listFirestoreDocuments(page, collectionPath)).length,
      { timeout: 20_000 },
    )
    .toBe(count);

  return listFirestoreDocuments(page, collectionPath);
};

/**
 * Removes every document of a collection, one request each.
 *
 * Deleting a document does not delete what is under it, and the floor plan
 * stores three levels: a room, the draft under it, and the restaurant's
 * tables. A fixture left behind is scoped to its own run's restaurant id and
 * so invisible to the app, but `/tableTokens` is top level and the emulator
 * keeps every write for the whole run, so the journeys hand all of it back.
 */
export const deleteFirestoreCollection = async (
  page: Page,
  collectionPath: string,
): Promise<void> => {
  const documents = await listFirestoreDocuments(page, collectionPath);

  await Promise.all(
    documents.map((document) =>
      deleteFirestoreDocument(page, `${collectionPath}/${document.id}`),
    ),
  );
};
