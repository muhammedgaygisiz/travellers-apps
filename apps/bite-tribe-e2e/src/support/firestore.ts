import { expect, Page } from '@playwright/test';

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
 * run, so a spec whose fixtures would otherwise stay visible to later specs
 * (a Bite in the shared nearby feed, say) can hand them back here.
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

export const getDocumentByStringField = async (
  page: Page,
  collectionId: string,
  fieldPath: string,
  value: string,
): Promise<Record<string, unknown> | undefined> => {
  const response = await page.request.post(
    `${FIRESTORE_EMULATOR_URL}:runQuery`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        structuredQuery: {
          from: [{ collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: { stringValue: value },
            },
          },
          limit: 1,
        },
      },
    },
  );

  if (!response.ok()) throw new Error(await response.text());

  const results = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;
  const document = results[0]?.document;
  return document ? decodeFields(document.fields ?? {}) : undefined;
};

export const getBiteByName = (
  page: Page,
  biteName: string,
): Promise<Record<string, unknown> | undefined> =>
  getDocumentByStringField(page, 'bites', 'name', biteName);

/**
 * Every document of a collection or subcollection, decoded. Used where the
 * assertion is about how many documents a flow wrote (a BiteTrail's `sells`
 * entries, say) rather than about one known document path.
 */
export const listFirestoreCollection = async (
  page: Page,
  collectionPath: string,
): Promise<Array<Record<string, unknown>>> => {
  const response = await page.request.get(
    `${FIRESTORE_EMULATOR_URL}/${collectionPath}`,
    { headers: { Authorization: 'Bearer owner' } },
  );

  if (!response.ok()) throw new Error(await response.text());

  const { documents } = (await response.json()) as {
    documents?: FirestoreDocument[];
  };

  return (documents ?? []).map((document) =>
    decodeFields(document.fields ?? {}),
  );
};

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

export const expectBiteFields = async (
  page: Page,
  biteName: string,
  fields: Record<string, unknown>,
): Promise<void> => {
  await expect
    .poll(() => getBiteByName(page, biteName), { timeout: 15_000 })
    .toMatchObject(fields);
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
