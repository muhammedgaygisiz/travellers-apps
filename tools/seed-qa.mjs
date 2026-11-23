// Seeds the QA project, bite-tribe-qa, with the accounts and the restaurant a
// QA test run and the release smoke test need (GitHub issue 2294).
//
//   npm run seed:qa
//
// Idempotent: run it again to put everything back the way a run expects it.
// Accounts are created or updated in place, documents are overwritten.
//
// Credentials: GOOGLE_APPLICATION_CREDENTIALS when set (CI, the QA deploy
// account), otherwise the gcloud CLI's own login. Both work through the admin
// REST APIs, which App Check does not gate.
//
// Passwords: the QA sites are on the public internet, so the accounts get
// generated passwords rather than the emulator's shared one. They live in
// apps/bite-tribe-firebase/.qa-accounts.env (gitignored), which this script
// creates on its first run and reads on every later one; in CI they come from
// the environment. Nothing here prints them.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT = 'bite-tribe-qa';
const ACCOUNTS_FILE = resolve('apps/bite-tribe-firebase/.qa-accounts.env');

/** Fixed ids, so every run updates the same accounts and documents. */
const ACCOUNTS = [
  {
    key: 'OWNER',
    localId: 'qa-owner',
    email: 'qa-owner@bitetribe.app',
    name: 'QA Owner',
    roles: ['business'],
  },
  {
    key: 'STAFF',
    localId: 'qa-staff',
    email: 'qa-staff@bitetribe.app',
    name: 'QA Staff',
    roles: ['staff'],
  },
  {
    key: 'GUEST',
    localId: 'qa-guest',
    email: 'qa-guest@bitetribe.app',
    name: 'QA Guest',
    roles: [],
  },
  {
    key: 'ADMIN',
    localId: 'qa-admin',
    email: 'qa-admin@bitetribe.app',
    name: 'QA Admin',
    roles: ['admin'],
  },
];

const RESTAURANT_ID = 'qa-trattoria';
const MENU_ID = 'qa-menu-trattoria';
const ROOM_ID = 'qa-room';
const TABLE_ID = 'qa-table-1';
const VISIT_ID = 'qa-visit-1';
/** Crockford-style alphabet the backend accepts: no I, L, O or U. */
const TABLE_TOKEN = 'QAQAQAQAQAQAQAQAQAQAQAQA01';

// --- credentials ----------------------------------------------------------

const accessToken = async () => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    return (await auth.getAccessToken()) ?? '';
  }

  return execFileSync('gcloud', ['auth', 'print-access-token'], {
    encoding: 'utf8',
  }).trim();
};

const passwords = () => {
  const fromEnv = Object.fromEntries(
    ACCOUNTS.map(({ key }) => [key, process.env[`QA_${key}_PASSWORD`]]),
  );

  if (Object.values(fromEnv).every(Boolean)) {
    return fromEnv;
  }

  const stored = existsSync(ACCOUNTS_FILE)
    ? Object.fromEntries(
        readFileSync(ACCOUNTS_FILE, 'utf8')
          .split('\n')
          .map((line) => line.match(/^QA_(\w+)_PASSWORD=(.*)$/))
          .filter(Boolean)
          .map(([, key, value]) => [key, value]),
      )
    : {};

  const all = Object.fromEntries(
    ACCOUNTS.map(({ key }) => [
      key,
      stored[key] || randomBytes(18).toString('base64url'),
    ]),
  );

  writeFileSync(
    ACCOUNTS_FILE,
    [
      '# QA test accounts (tools/seed-qa.mjs). Gitignored; keep it that way.',
      ...ACCOUNTS.flatMap(({ key, email }) => [
        `QA_${key}_EMAIL=${email}`,
        `QA_${key}_PASSWORD=${all[key]}`,
      ]),
      '',
    ].join('\n'),
    { mode: 0o600 },
  );

  return all;
};

// --- REST helpers -----------------------------------------------------------

let token = '';

const call = async (url, body, method = 'POST') => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROJECT,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${method} ${url.split('?')[0]} ${response.status}: ${text}`,
    );
  }

  return text ? JSON.parse(text) : {};
};

const IDENTITY = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const value = (v) => {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(v).map(([key, inner]) => [key, value(inner)]),
      ),
    },
  };
};

const put = (path, doc) =>
  call(
    `${FIRESTORE}/${path}`,
    {
      fields: Object.fromEntries(
        Object.entries(doc).map(([key, inner]) => [key, value(inner)]),
      ),
    },
    'PATCH',
  );

/** Only the listed fields, so a write leaves the rest of the document alone. */
const merge = (path, doc) =>
  call(
    `${FIRESTORE}/${path}?${Object.keys(doc)
      .map((key) => `updateMask.fieldPaths=${key}`)
      .join('&')}`,
    {
      fields: Object.fromEntries(
        Object.entries(doc).map(([key, inner]) => [key, value(inner)]),
      ),
    },
    'PATCH',
  );

// --- accounts ---------------------------------------------------------------

const upsertAccount = async ({ localId, email, name, roles }, password) => {
  const found = await call(`${IDENTITY}/accounts:lookup`, {
    localId: [localId],
  });

  if (!found.users?.length) {
    await call(`${IDENTITY}/accounts`, {
      localId,
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
  }

  await call(`${IDENTITY}/accounts:update`, {
    localId,
    email,
    password,
    displayName: name,
    emailVerified: true,
    customAttributes: JSON.stringify(roles.length ? { roles } : {}),
  });
};

// --- restaurant -------------------------------------------------------------

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const seedRestaurant = async () => {
  const now = Date.now();

  await put(`menus/${MENU_ID}`, {
    id: MENU_ID,
    restaurantId: RESTAURANT_ID,
    currency: 'EUR',
    categories: [
      {
        id: 'qa-c-antipasti',
        title: 'Antipasti',
        subtitle: 'To share',
        items: [
          {
            id: 'qa-i-bruschetta',
            name: 'Bruschetta',
            description: 'Tomato, basil',
            price: 6.5,
            isAvailable: true,
            dietaryLabels: ['vegan'],
          },
          {
            id: 'qa-i-burrata',
            name: 'Burrata',
            description: 'With anchovies',
            price: 11.5,
            isAvailable: true,
          },
        ],
      },
      {
        id: 'qa-c-pizze',
        title: 'Pizze',
        items: [
          {
            id: 'qa-i-margherita',
            name: 'Margherita',
            description: 'San Marzano, fior di latte',
            price: 0,
            isAvailable: true,
            dietaryLabels: ['vegetarian'],
            variants: [
              {
                id: 'qa-v-regular',
                name: 'Regular',
                description: '',
                price: 9,
              },
              { id: 'qa-v-large', name: 'Large', description: '', price: 13 },
            ],
          },
          {
            id: 'qa-i-diavola',
            name: 'Diavola',
            description: 'Spicy salame',
            price: 11.5,
            isAvailable: true,
            optionGroups: [
              {
                id: 'qa-g-heat',
                name: 'How hot',
                required: true,
                choices: [
                  { id: 'qa-ch-medium', name: 'Medium' },
                  { id: 'qa-ch-hot', name: 'Hot' },
                ],
              },
            ],
          },
        ],
        extrasBlock: {
          description: 'Add to any pizza',
          extras: [
            { id: 'qa-e-mozzarella', name: 'Extra mozzarella', price: 2 },
          ],
        },
      },
    ],
  });

  await put(`restaurants/${RESTAURANT_ID}`, {
    id: RESTAURANT_ID,
    name: 'QA Trattoria',
    description: 'The QA test restaurant. Reset by npm run seed:qa.',
    ownerUserIds: ['qa-owner'],
    claimStatus: 'claimed',
    menuId: MENU_ID,
    position: { latitude: 48.137154, longitude: 11.576124 },
    address: {
      street: 'Marienplatz 1',
      postcode: '80331',
      city: 'München',
      country: 'Germany',
    },
    openingHours: DAYS.map((day) => ({
      day,
      isOpen: true,
      timeRanges: [{ from: '00:00', to: '23:59' }],
    })),
    tableOrdering: { enabled: true, timeZone: 'Europe/Berlin' },
  });

  await put(`restaurantStaff/qa-staff`, { restaurantId: RESTAURANT_ID });

  await put(`restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}`, {
    id: ROOM_ID,
    name: 'Main room',
    order: 0,
  });
  await put(`restaurants/${RESTAURANT_ID}/tables/${TABLE_ID}`, {
    label: '1',
    roomId: ROOM_ID,
    seats: 4,
    enabled: true,
    shape: 'round',
    diameter: 900,
    rotation: 0,
    position: { x: 2000, y: 3000 },
  });
  await put(`tableTokens/${TABLE_TOKEN}`, {
    restaurantId: RESTAURANT_ID,
    roomId: ROOM_ID,
    tableId: TABLE_ID,
    tableLabel: '1',
    tableEnabled: true,
    status: 'active',
    issuedAt: new Date(now).toISOString(),
    issuedAtTimestamp: now,
  });
  await put(`restaurants/${RESTAURANT_ID}/visits/${VISIT_ID}`, {
    id: VISIT_ID,
    restaurantId: RESTAURANT_ID,
    tableId: TABLE_ID,
    status: 'open',
    openedAt: now,
  });
  await put(`restaurants/${RESTAURANT_ID}/tableStates/${TABLE_ID}`, {
    tableId: TABLE_ID,
    restaurantId: RESTAURANT_ID,
    status: 'occupied',
    since: now,
    updatedByUserId: 'qa-owner',
    visitId: VISIT_ID,
  });
};

// --- run --------------------------------------------------------------------

token = await accessToken();
const secrets = passwords();

for (const account of ACCOUNTS) {
  await upsertAccount(account, secrets[account.key]);
  console.log(
    `account ${account.email} (${account.roles.join(', ') || 'guest'})`,
  );
}

// The guest skips onboarding, so a run reaches the app rather than the wizard.
// Merged, because the user-creation trigger writes the rest of the profile.
await merge('users/qa-guest', {
  onboardingCompletedAt: new Date().toISOString(),
  onboardingCompletedAtTimestamp: Date.now(),
});

await seedRestaurant();

console.log(`restaurant ${RESTAURANT_ID}, menu ${MENU_ID}, table ${TABLE_ID}`);
console.log('Consumer menu: https://bite-tribe-qa.web.app/m/qa-trattoria');
console.log(`Table 1:       https://bite-tribe-qa.web.app/t/${TABLE_TOKEN}`);
console.log('Business:      https://bite-tribe-qa-business.web.app');
console.log('Admin:         https://bite-tribe-qa-admin.web.app');
console.log(`Passwords:     ${ACCOUNTS_FILE}`);
