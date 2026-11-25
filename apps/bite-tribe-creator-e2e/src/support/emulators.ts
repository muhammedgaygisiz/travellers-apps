import { expect, Page } from '@playwright/test';

/**
 * Firestore emulator REST endpoint. `Bearer owner` is the emulator's
 * rules-bypassing owner credential, so the suite can seed and read back
 * without going through the app.
 */
const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

const OWNER = { Authorization: 'Bearer owner' };

/** Seeds a Bite owned by `userId`, so the create page has one to pick. */
export const seedBite = async (
  page: Page,
  id: string,
  userId: string,
  name: string,
): Promise<void> => {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/bites/${id}`,
    {
      headers: OWNER,
      data: {
        fields: {
          name: { stringValue: name },
          userId: { stringValue: userId },
          createdAtTimestamp: { integerValue: `${Date.now()}` },
        },
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
};

export interface StoredBiteTrail {
  id: string;
  fieldNames: string[];
  ownerId?: string;
  biteIds: string[];
}

/** The BiteTrails named `name`, as stored. */
export const findBiteTrailsByName = async (
  page: Page,
  name: string,
): Promise<StoredBiteTrail[]> => {
  const response = await page.request.post(
    `${FIRESTORE_EMULATOR_URL}:runQuery`,
    {
      headers: OWNER,
      data: {
        structuredQuery: {
          from: [{ collectionId: 'biteTrails' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'name' },
              op: 'EQUAL',
              value: { stringValue: name },
            },
          },
        },
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();

  const rows = (await response.json()) as {
    document?: {
      name: string;
      fields: Record<
        string,
        {
          stringValue?: string;
          arrayValue?: { values?: { stringValue?: string }[] };
        }
      >;
    };
  }[];

  return rows.flatMap(({ document }) =>
    document
      ? [
          {
            id: document.name.split('/').pop() as string,
            fieldNames: Object.keys(document.fields),
            ownerId: document.fields['ownerId']?.stringValue,
            biteIds: (document.fields['biteIds']?.arrayValue?.values ?? []).map(
              (value) => value.stringValue as string,
            ),
          },
        ]
      : [],
  );
};

/** Removes a document again, so a later run starts from the seeded state. */
export const deleteDocument = async (
  page: Page,
  path: string,
): Promise<void> => {
  await page.request.delete(`${FIRESTORE_EMULATOR_URL}/${path}`, {
    headers: OWNER,
  });
};
