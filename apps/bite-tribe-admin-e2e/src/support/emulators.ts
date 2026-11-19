import { expect, Page } from '@playwright/test';

/**
 * Firestore emulator REST endpoint. `Bearer owner` is the emulator's
 * rules-bypassing owner credential, so the suite can read back what the app
 * wrote without going through the app.
 */
const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

export interface StoredRestaurant {
  id: string;
  fieldNames: string[];
  name?: string;
  menuId?: string;
  imagePath?: string;
}

/** The restaurants named `name`, as stored. */
export const findRestaurantsByName = async (
  page: Page,
  name: string,
): Promise<StoredRestaurant[]> => {
  const response = await page.request.post(
    `${FIRESTORE_EMULATOR_URL}:runQuery`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        structuredQuery: {
          from: [{ collectionId: 'restaurants' }],
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
      fields: Record<string, { stringValue?: string }>;
    };
  }[];

  return rows.flatMap(({ document }) =>
    document
      ? [
          {
            id: document.name.split('/').pop() as string,
            fieldNames: Object.keys(document.fields),
            name: document.fields['name']?.stringValue,
            menuId: document.fields['menuId']?.stringValue,
            imagePath: document.fields['imagePath']?.stringValue,
          },
        ]
      : [],
  );
};

/**
 * The object names under a Storage prefix, in the bucket a download URL names.
 * Read from the URL rather than hardcoded: CI builds with
 * `bite-tribe.appspot.com` and a local `.env` may name another (issue #1953).
 */
export const listStorageObjects = async (
  page: Page,
  downloadUrl: string,
  prefix: string,
): Promise<string[]> => {
  const url = new URL(downloadUrl);
  const bucket = url.pathname.split('/')[3];
  const response = await page.request.get(
    `${url.origin}/v0/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  expect(response.ok(), await response.text()).toBeTruthy();

  const { items = [] } = (await response.json()) as {
    items?: { name: string }[];
  };

  return items.map((item) => item.name);
};

/** Seeds a pending restaurant candidate with no Bite evidence. */
export const seedPendingCandidate = async (
  page: Page,
  id: string,
  name: string,
): Promise<void> => {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/restaurantCandidates/${id}`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: {
          status: { stringValue: 'pending' },
          name: { stringValue: name },
          biteIds: { arrayValue: { values: [] } },
          position: {
            mapValue: {
              fields: {
                latitude: { doubleValue: 48.137154 },
                longitude: { doubleValue: 11.576124 },
              },
            },
          },
          createdAtTimestamp: { integerValue: `${Date.now()}` },
        },
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
};

/** A candidate's status and the restaurant it was verified into. */
export const readCandidate = async (
  page: Page,
  id: string,
): Promise<{ status?: string; verifiedRestaurantId?: string }> => {
  const response = await page.request.get(
    `${FIRESTORE_EMULATOR_URL}/restaurantCandidates/${id}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  const { fields = {} } = (await response.json()) as {
    fields?: Record<string, { stringValue?: string }>;
  };

  return {
    status: fields['status']?.stringValue,
    verifiedRestaurantId: fields['verifiedRestaurantId']?.stringValue,
  };
};

/** Removes a candidate again. */
export const deleteCandidate = async (
  page: Page,
  id: string,
): Promise<void> => {
  await page.request.delete(
    `${FIRESTORE_EMULATOR_URL}/restaurantCandidates/${id}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
};

/** Removes a restaurant again, so a later run starts from the seeded state. */
export const deleteRestaurant = async (
  page: Page,
  id: string,
): Promise<void> => {
  await page.request.delete(`${FIRESTORE_EMULATOR_URL}/restaurants/${id}`, {
    headers: { Authorization: 'Bearer owner' },
  });
};
