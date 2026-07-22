import { join } from 'node:path';
import { expect, Page, Route, test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');
const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

async function setPreferredCurrency(
  page: Page,
  currency: string,
): Promise<void> {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/settings/${TEST_USERS.default.uid}` +
      '?updateMask.fieldPaths=currency',
    {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: { currency: { stringValue: currency } } },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

async function mockPositionCurrency(
  page: Page,
  currency: string | null,
): Promise<void> {
  await page.route('**/getCurrencyByPosition', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'POST',
          'access-control-allow-origin': '*',
        },
      });
      return;
    }

    expect(route.request().postDataJSON()).toEqual({
      data: {
        latitude: 48.137154,
        longitude: 11.576124,
      },
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ result: { currency } }),
    });
  });
}

async function expectSavedCurrency(
  page: Page,
  biteName: string,
  currency: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
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

        if (!response.ok()) {
          throw new Error(await response.text());
        }

        const results = (await response.json()) as Array<{
          document?: { fields?: { currency?: { stringValue?: string } } };
        }>;
        return results[0]?.document?.fields?.currency?.stringValue;
      },
      { timeout: 10_000 },
    )
    .toBe(currency);
}

async function prepareCreateBite(page: Page): Promise<CreateBitePage> {
  await loginAsTestUser(page);
  await completeOnboardingIfNeeded(page);
  await dismissCoachMarks(page);

  const createBite = new CreateBitePage(page);
  await createBite.open();
  return createBite;
}

test.describe('Bite location, currency, and data quality', () => {
  test('prefills currency from the position and persists a manual override', async ({
    page,
  }) => {
    await setPreferredCurrency(page, 'EUR');
    await mockPositionCurrency(page, 'USD');

    const createBite = await prepareCreateBite(page);
    await createBite.expectCurrency('US Dollar');

    await createBite.chooseCurrency('CHF');
    await createBite.expectCurrency('Swiss Franc');

    const runId = Date.now();
    const biteName = `Currency Override Bite ${runId}`;
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(biteName);
    await createBite.chooseCustomRestaurant(`Currency Cafe ${runId}`);
    await createBite.fillPrice('24.50');
    await createBite.useGpsPosition();
    await createBite.expectPostEnabled();
    await createBite.submit();

    await page.waitForURL('**/home');
    await expectSavedCurrency(page, biteName, 'CHF');
  });

  test('falls back to the preferred currency and recovers from an invalid price', async ({
    page,
  }) => {
    await setPreferredCurrency(page, 'EUR');
    await mockPositionCurrency(page, null);

    const createBite = await prepareCreateBite(page);
    await createBite.expectCurrency('Euro');

    const runId = Date.now();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(`Fallback Currency Bite ${runId}`);
    await createBite.chooseCustomRestaurant(`Fallback Cafe ${runId}`);
    await createBite.useGpsPosition();

    await createBite.fillPrice('not-a-price');
    await createBite.price.blur();
    await createBite.expectInvalidPriceMessage();
    await createBite.expectPostDisabled();

    await createBite.fillPrice('18.00');
    await createBite.expectNoInvalidPriceMessage();
    await createBite.expectPostEnabled();
  });
});
