/**
 * Publishes a city landing page in the local emulators, built from the seeded
 * Bites, so the page can be looked at without curating one by hand first
 * (epic #1487).
 *
 * The Bites in `.firebase-export` predate `imageStatus` and carry no `city`,
 * so neither the admin editor nor the public page would accept them. This
 * script marks each Bite that has a photo as uploaded, gives it a city, and
 * writes `landingPages/<city>` as published, with the same snapshot shape
 * `saveLandingPage` writes. It talks to the Firestore emulator only: the
 * `Bearer owner` token it sends is the emulator's admin bypass and means
 * nothing to a real project.
 *
 * Nothing is written back to the export. Run it again after every emulator
 * start.
 *
 * Usage, with the emulators running (`nx firebase-serve bite-tribe-firebase`):
 *
 *   node apps/bite-tribe-firebase/scripts/seed-city-page.mjs
 *
 * Options: `--city berlin` (the page's id and URL, `/eat/<city>`) and
 * `--city-name Berlin`.
 * `FIRESTORE_EMULATOR_HOST` (default `127.0.0.1:8080`) and `--project`
 * (default `bite-tribe`) select the emulator.
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, index, all) => {
    if (arg.startsWith('--')) {
      pairs.push([arg.slice(2), all[index + 1]]);
    }
    return pairs;
  }, []),
);

const project = args.project ?? 'bite-tribe';
const city = args.city ?? 'berlin';
const cityName = args['city-name'] ?? 'Berlin';
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

const CITY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!CITY.test(city)) {
  console.error('--city takes lowercase letters, digits and hyphens.');
  process.exit(1);
}

const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const headers = {
  Authorization: 'Bearer owner',
  'Content-Type': 'application/json',
};

const request = async (url, init = {}) => {
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${url}: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
};

const value = (field) => (field ? Object.values(field)[0] : undefined);
const str = (stringValue) => ({ stringValue });

let bites;
try {
  ({ documents: bites = [] } = await request(`${base}/bites?pageSize=50`));
} catch (error) {
  console.error(
    `Could not reach the Firestore emulator at ${host}. Start it with ` +
      '`npx nx firebase-serve bite-tribe-firebase` and run this again.',
  );
  console.error(error.message);
  process.exit(1);
}

const withPhoto = bites
  .filter((doc) => value(doc.fields?.imagePath))
  .slice(0, 5);

if (withPhoto.length < 3) {
  console.error(
    `A published page needs three Bites with a photo; the emulator holds ${withPhoto.length}.`,
  );
  process.exit(1);
}

const items = [];

for (const doc of withPhoto) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields;
  const biteCity = value(fields.city) ?? cityName;

  // What `isListableBite` and the public page need: an uploaded photo and a
  // city. Only the two fields are touched, so the rest of the Bite stays as
  // the export has it.
  await request(
    `${base}/bites/${id}?updateMask.fieldPaths=imageStatus&updateMask.fieldPaths=city`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fields: { imageStatus: str('uploaded'), city: str(biteCity) },
      }),
    },
  );

  items.push({
    mapValue: {
      fields: {
        biteId: str(id),
        name: str(value(fields.name) ?? id),
        imageUrl: str(value(fields.imagePath)),
        place: str(value(fields.place) ?? ''),
        locality: str(biteCity),
      },
    },
  });
}

const now = { timestampValue: new Date().toISOString() };

await request(`${base}/landingPages/${city}`, {
  method: 'PATCH',
  body: JSON.stringify({
    fields: {
      city: str(city),
      cityName: str(cityName),
      countryCode: str('DE'),
      locale: str('en'),
      status: str('published'),
      title: str(`Comfort food in ${cityName}`),
      metaDescription: str(
        `${items.length} comfort dishes in ${cityName}, picked from real Bites.`,
      ),
      intro: str(
        'When it is cold, these are the plates we go back to. Seeded locally from the emulator Bites.',
      ),
      biteIds: {
        arrayValue: {
          values: items.map((item) => item.mapValue.fields.biteId),
        },
      },
      items: { arrayValue: { values: items } },
      publishedAt: now,
      updatedAt: now,
      updatedBy: str('seed-city-page'),
    },
  }),
});

const functions = `http://127.0.0.1:5001/${project}/us-central1/renderCityPage`;

console.log(`Published landingPages/${city} with ${items.length} Bites:`);
for (const item of items) {
  console.log(`  - ${item.mapValue.fields.name.stringValue}`);
}
console.log('');
console.log(`Page:     ${functions}/eat/${city}`);
console.log(`Sitemap:  ${functions}/eat/sitemap.xml`);
console.log('Editor:   http://localhost:4302/landing-pages (admin@test.com)');
