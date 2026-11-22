import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  createFakeFirestore,
  DELETE_SENTINEL,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: (): unknown => DELETE_SENTINEL },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (options: unknown, handler?: unknown) => handler ?? options,
  ),
}));

jest.mock('../../shared/utils/deployment-stage', () => ({
  resolveDeploymentStage: (): string => 'dev',
}));

jest.mock('../../shared/moderation/content-refusal', () => ({
  recordContentRefusal: jest.fn(),
}));

import { CallableRequest } from 'firebase-functions/https';
import { recordContentRefusal } from '../../shared/moderation/content-refusal';
import {
  saveRestaurantDietaryStatementsHandler,
  SaveRestaurantDietaryStatementsRequest,
} from '../save-restaurant-dietary-statements';

const OWNER = 'owner-1';
const RESTAURANT = 'restaurants/r-1';

const as = (
  uid: string,
  roles: string[],
  data: SaveRestaurantDietaryStatementsRequest,
): CallableRequest<SaveRestaurantDietaryStatementsRequest> =>
  ({
    auth: {
      uid,
      token: { roles, firebase: { sign_in_provider: 'password' } },
    },
    data: { restaurantId: 'r-1', ...data },
  }) as unknown as CallableRequest<SaveRestaurantDietaryStatementsRequest>;

/** See GitHub issue #2194. */
describe('saveRestaurantDietaryStatements', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(RESTAURANT, {
      name: 'Green Bowl',
      ownerUserIds: [OWNER],
      dietaryStatements: ['fully-vegetarian'],
      crossContaminationNote: 'Shared fryer.',
    });
    (recordContentRefusal as jest.Mock).mockClear();
  });

  it('writes the statements in list order and the trimmed note', async () => {
    await expect(
      saveRestaurantDietaryStatementsHandler(
        as(OWNER, ['business'], {
          statements: ['fully-halal', 'fully-plant-based'],
          crossContaminationNote: '  Nuts are used in the kitchen. ',
        }),
      ),
    ).resolves.toEqual({ status: 'saved' });

    expect(db.read(RESTAURANT)).toMatchObject({
      name: 'Green Bowl',
      dietaryStatements: ['fully-plant-based', 'fully-halal'],
      crossContaminationNote: 'Nuts are used in the kitchen.',
    });
  });

  it('removes both fields when nothing is stated', async () => {
    await saveRestaurantDietaryStatementsHandler(
      as(OWNER, ['business'], { statements: [], crossContaminationNote: ' ' }),
    );

    expect(db.read(RESTAURANT)).not.toHaveProperty('dietaryStatements');
    expect(db.read(RESTAURANT)).not.toHaveProperty('crossContaminationNote');
  });

  it('lets an operator save', async () => {
    await expect(
      saveRestaurantDietaryStatementsHandler(
        as('operator-1', ['admin'], { statements: ['fully-kosher'] }),
      ),
    ).resolves.toEqual({ status: 'saved' });
  });

  it('refuses a business account that does not hold the restaurant', async () => {
    await expect(
      saveRestaurantDietaryStatementsHandler(
        as('other-owner', ['business'], { statements: ['fully-halal'] }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(db.read(RESTAURANT)?.['dietaryStatements']).toEqual([
      'fully-vegetarian',
    ]);
  });

  it('refuses an objectionable note, writes nothing and records it', async () => {
    await expect(
      saveRestaurantDietaryStatementsHandler(
        as(OWNER, ['business'], {
          statements: ['fully-halal'],
          crossContaminationNote: 'cunt',
        }),
      ),
    ).resolves.toEqual({ status: 'refused', field: 'crossContaminationNote' });

    expect(db.read(RESTAURANT)).toMatchObject({
      dietaryStatements: ['fully-vegetarian'],
      crossContaminationNote: 'Shared fryer.',
    });
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: OWNER,
        surface: 'restaurantDietaryNote',
        targetId: 'r-1',
      }),
    );
  });

  it.each([
    [{ statements: ['fully-keto'] }],
    [{ statements: 'fully-halal' }],
    [{ crossContaminationNote: 42 }],
    [{ crossContaminationNote: 'x'.repeat(501) }],
  ])('rejects malformed input %j', async (data) => {
    await expect(
      saveRestaurantDietaryStatementsHandler(as(OWNER, ['business'], data)),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
