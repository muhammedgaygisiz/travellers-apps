import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { MenuPage } from '../pages/menu.page';
import { RestaurantPage } from '../pages/restaurant.page';
import { SearchPage } from '../pages/search.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  expectBiteFields,
  getBiteByName,
  queryDocumentsByStringField,
} from '../support/firestore';
import {
  deleteRestaurantWithMenu,
  seedRestaurantWithMenu,
} from '../support/menu-fixture';
import { completeOnboardingIfNeeded } from '../support/onboarding';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

/**
 * Asserts the Bites of one "add another" session were all posted at the same
 * place: same Restaurant, same currency, same position, none of which the user
 * entered again after the first Bite.
 */
const expectSameSessionPlace = async (
  page: Page,
  dishes: string[],
  place: string,
): Promise<void> => {
  for (const dish of dishes) {
    await expectBiteFields(page, dish, { place });
  }

  const saved = await Promise.all(
    dishes.map((dish) => getBiteByName(page, dish)),
  );

  const distinct = (values: unknown[]): number =>
    new Set(values.map((value) => JSON.stringify(value))).size;

  expect(distinct(saved.map((bite) => bite?.['currency']))).toBe(1);
  expect(distinct(saved.map((bite) => bite?.['position']))).toBe(1);
};

/** Removes the Bites a session created, so the next run starts from the same state. */
const deleteBitesNamed = async (page: Page, names: string[]): Promise<void> => {
  for (const name of names) {
    const [bite] = await queryDocumentsByStringField(
      page,
      'bites',
      'name',
      name,
    );

    if (bite) {
      await deleteFirestoreDocument(page, bite.path);
    }
  }
};

/**
 * Cover for "Post and add another Bite": the button posts the Bite and keeps
 * the user on the form, carrying the Restaurant, currency and position over to
 * the next one, so a table of several dishes can be posted in one sitting.
 *
 * The suite posted every Bite with the regular button, which leaves the form,
 * so nothing exercised a creation session that outlives a save.
 */
test.describe('Post and add another Bite', () => {
  test('posts three Bites in one session started from Home', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    // Unique per run: the emulator keeps what earlier runs created, and an
    // existing exact match would hide the "Use: ..." custom restaurant option.
    const restaurant = `Add Another Bistro ${runId}`;
    const dishes = [
      `Kaiserschmarrn ${runId}`,
      `Obatzda ${runId}`,
      `Apfelstrudel ${runId}`,
    ];

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const createBite = new CreateBitePage(page);
    await createBite.open();

    // The first Bite sets the session up: the place, the position, and the
    // currency that follows from it.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(dishes[0]);
    await createBite.chooseCustomRestaurant(restaurant);
    await createBite.fillPrice('12.50');
    await createBite.useGpsPosition();
    await createBite.chooseRating(4);
    await createBite.fillDescription('Enough for two.');
    await createBite.addTag('sweet');

    const currency = await createBite.currencyName();

    await createBite.expectPostAndAddAnotherEnabled();
    await createBite.submitAndAddAnother();

    // The user stays on the form, and what was specific to the posted Bite is
    // gone while the place they are still sitting at is kept.
    await expect(page).toHaveURL(/\/new-bite$/);
    await expect(
      page.getByText('Bite created successfully!').first(),
    ).toBeVisible();
    await createBite.expectReadyForNextBite({ place: restaurant, currency });

    // The tags of the Bites already posted here lead the suggestions.
    await createBite.expectSuggestedTag('sweet');

    // So the second Bite needs only its own dish, price and photo: no
    // restaurant, no position, no currency.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(dishes[1]);
    await createBite.fillPrice('7.00');

    await createBite.expectPostAndAddAnotherEnabled();
    await createBite.submitAndAddAnother();
    await expect(page).toHaveURL(/\/new-bite$/);
    await createBite.expectReadyForNextBite({ place: restaurant, currency });

    // The last one is posted with the regular button, which ends the session
    // and returns to Home.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(dishes[2]);
    await createBite.fillPrice('4.25');

    await createBite.expectPostEnabled();
    await createBite.submit();

    await page.waitForURL('**/home');
    await expect(
      page.getByText('Bite created successfully!').first(),
    ).toBeVisible();

    await expectSameSessionPlace(page, dishes, restaurant);

    await deleteBitesNamed(page, dishes);
  });

  test('keeps the menu-derived Restaurant for every Bite of the session', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const runId = Date.now();
    const fixture = {
      restaurantId: `add-another-restaurant-${runId}`,
      restaurantName: `Add Another Menu Bistro ${runId}`,
      menuId: `add-another-menu-${runId}`,
      biteId: `add-another-bite-${runId}`,
      biteName: `Add Another Starter ${runId}`,
      dishes: [
        {
          name: `Nom Banh Chok ${runId}`,
          description: 'Rice noodles with green fish curry.',
          price: 6.5,
        },
      ],
    };
    const [menuDish] = fixture.dishes;
    // The dishes the user types once the session is running. Only the first
    // Bite comes from the menu; the rest are entered at the same table.
    const typedDishes = [`Bai Sach Chrouk ${runId}`, `Kuy Teav ${runId}`];

    await seedRestaurantWithMenu(page, fixture);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const search = new SearchPage(page);
    const restaurantPage = new RestaurantPage(page);
    const menu = new MenuPage(page);
    const createBite = new CreateBitePage(page);

    await search.open();
    await search.selectCategory('Restaurant');
    await search.search(fixture.restaurantName);
    await search.expectResult(fixture.restaurantName);
    await search.openResult(fixture.restaurantName);
    await page.waitForURL(
      new RegExp(`/bite/[^/]+/restaurant/${fixture.restaurantId}$`),
    );
    await restaurantPage.openMenu();

    // The menu item seeds the session, so this Bite only needs its photo.
    await menu.expectItem(menuDish.name);
    await menu.createBiteFrom(menuDish.name);
    await createBite.expectPrefilledWith({
      name: menuDish.name,
      place: fixture.restaurantName,
      price: '6.5',
    });

    const currency = await createBite.currencyName();

    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.expectPostAndAddAnotherEnabled();
    await createBite.submitAndAddAnother();

    await expect(page).toHaveURL(/\/new-bite$/);
    await expect(
      page.getByText('Bite created successfully!').first(),
    ).toBeVisible();
    await createBite.expectReadyForNextBite({
      place: fixture.restaurantName,
      currency,
    });

    // The dish the menu prefilled is gone, but the Restaurant it identified
    // carries into the Bites the user now types by hand.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(typedDishes[0]);
    await createBite.fillPrice('5.00');

    await createBite.expectPostAndAddAnotherEnabled();
    await createBite.submitAndAddAnother();
    await expect(page).toHaveURL(/\/new-bite$/);
    await createBite.expectReadyForNextBite({
      place: fixture.restaurantName,
      currency,
    });

    // The third one ends the session with the regular button.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(typedDishes[1]);
    await createBite.fillPrice('4.00');

    await createBite.expectPostEnabled();
    await createBite.submit();

    await page.waitForURL('**/home');

    const sessionDishes = [menuDish.name, ...typedDishes];
    await expectSameSessionPlace(page, sessionDishes, fixture.restaurantName);

    // The verified Restaurant is what the menu contributed, and every Bite of
    // the session keeps it — including the ones whose dish was typed.
    for (const dish of sessionDishes) {
      await expectBiteFields(page, dish, {
        place: fixture.restaurantName,
        restaurantId: fixture.restaurantId,
      });
    }

    await deleteBitesNamed(page, sessionDishes);
    await deleteRestaurantWithMenu(page, fixture);
  });
});
