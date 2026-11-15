import { join } from 'node:path';
import { expect, Page, Request, test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { completeOnboardingIfNeeded } from '../support/onboarding';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

const GENERATED =
  'Thin Neapolitan pizza with tomato, mozzarella and basil, baked in minutes in a wood oven.';

/**
 * The callable answers for the model: the emulated function has no Google
 * Cloud credentials, and a run must not spend real Vertex calls. What the app
 * sends and what it does with each answer is the part under test here; the
 * function itself is covered by its own unit tests (issue #2030).
 */
const answerGenerate = async (
  page: Page,
  result: Record<string, unknown>,
): Promise<Request[]> => {
  const calls: Request[] = [];

  await page.route('**/generateBiteDescription', async (route) => {
    calls.push(route.request());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result }),
    });
  });

  return calls;
};

const openCreateBite = async (page: Page): Promise<CreateBitePage> => {
  await loginAsTestUser(page);
  await completeOnboardingIfNeeded(page);
  await dismissCoachMarks(page);

  const createBite = new CreateBitePage(page);
  await createBite.open();

  return createBite;
};

test.describe('Generate a Bite description', () => {
  test('writes a description from the dish and photo, asking before it replaces the user’s own', async ({
    page,
  }) => {
    const calls = await answerGenerate(page, {
      status: 'ok',
      description: GENERATED,
    });
    const createBite = await openCreateBite(page);

    // Without a dish name the model would only have the photo to guess from.
    await expect(createBite.generateDescription).toBeDisabled();

    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName('Margherita Pizza');
    await createBite.description.fill('My own words');
    await createBite.generateDescription.click();

    // A description the user wrote is never replaced without asking.
    const prompt = page.locator('ion-alert');
    await expect(prompt).toContainText('Replace your description?');
    await prompt.getByRole('button', { name: 'Replace' }).click();

    await expect(createBite.description).toHaveValue(GENERATED);
    expect(calls).toHaveLength(1);

    const sent = calls[0].postDataJSON().data;
    expect(sent.dishName).toBe('Margherita Pizza');
    expect(sent.language).toBe('en');
    // The photo goes shrunk, as a JPEG data URL.
    expect(sent.image).toMatch(/^data:image\/jpeg;base64,/);

    // Its own text may be replaced without asking, for another version. The
    // answer is the same text, so wait for the call rather than the field.
    const again = page.waitForRequest('**/generateBiteDescription');
    await createBite.generateDescription.click();
    await again;
    await expect(createBite.generateDescription).toBeEnabled();
    expect(calls).toHaveLength(2);
    await expect(prompt).toBeHidden();
  });

  test('says so when the day’s descriptions are used up and leaves the field alone', async ({
    page,
  }) => {
    await answerGenerate(page, { status: 'limit' });
    const createBite = await openCreateBite(page);

    await createBite.fillName('Margherita Pizza');
    await createBite.generateDescription.click();

    await expect(
      page.getByText("You've used today's descriptions. Try again tomorrow."),
    ).toBeVisible();
    await expect(createBite.description).toHaveValue('');
    await expect(createBite.generateDescription).toBeEnabled();
  });
});
