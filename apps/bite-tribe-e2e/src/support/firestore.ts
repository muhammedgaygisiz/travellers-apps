import { expect, Page } from '@playwright/test';

export const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

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

export const getBiteByName = async (
  page: Page,
  biteName: string,
): Promise<Record<string, unknown> | undefined> => {
  const response = await page.request.post(
    `${FIRESTORE_EMULATOR_URL}:runQuery`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        structuredQuery: {
          from: [{ collectionId: 'bites' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'name' },
              op: 'EQUAL',
              value: { stringValue: biteName },
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

export const expectBiteFields = async (
  page: Page,
  biteName: string,
  fields: Record<string, unknown>,
): Promise<void> => {
  await expect
    .poll(() => getBiteByName(page, biteName), { timeout: 15_000 })
    .toMatchObject(fields);
};
