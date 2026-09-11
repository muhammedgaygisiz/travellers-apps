import { randomBytes } from 'node:crypto';
import {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import {
  RESTAURANT_COLLECTION,
  holdsRestaurant,
  parseRequiredString,
  requireRestaurantAuthority,
} from './restaurant-authority';

/**
 * The opaque QR token of a table (GitHub issue #1086).
 *
 * ```text
 * /tableTokens/{token}
 * ```
 *
 * Top-level and named by the token itself, so a scan is one document read by
 * an unauthenticated client - a guest at a table has no session, and the scan
 * has to resolve before anything can ask them for one. Nesting it under the
 * restaurant would mean the scanner already knowing which restaurant it is at,
 * which is the fact the scan exists to establish.
 *
 * `firestore.rules` allows `get` and refuses `list`, which is what makes the
 * collection non-enumerable: a token can be read by whoever holds it and the
 * set of them cannot be walked.
 */
export const TABLE_TOKENS_COLLECTION = 'tableTokens';

export const TABLES_COLLECTION = 'tables';

/**
 * Crockford base32, uppercase.
 *
 * Two reasons rather than one. A QR code encodes digits and uppercase letters
 * in *alphanumeric* mode and anything else in byte mode, so this alphabet
 * makes a printed table code smaller and its error correction stronger at the
 * same module count. And Crockford drops `I`, `L`, `O` and `U`, so a token
 * read aloud or typed off a sheet during a support call has no character pair
 * that can be confused for another.
 *
 * Exactly 32 characters is what keeps the draw uniform: 256 is a whole number
 * of 32s, so `byte % 32` has no modulo bias to correct for.
 */
export const TOKEN_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * 26 characters, five bits each: 130 bits of entropy.
 *
 * Well past guessing, and past the birthday bound for any number of tables
 * this product will ever hold, which is what lets a collision be treated as
 * the impossibility it is rather than as a retry loop.
 */
export const TOKEN_LENGTH = 26;

export type TableQrTokenStatus = 'active' | 'superseded' | 'revoked';

/**
 * What a scan resolves to.
 *
 * The three `table*` fields are copies of fields on the table document, and
 * copies because of the read they save: [[Table]] keeps a token valid when the
 * table moves room or is renamed (issue #1085), so a token that stored only
 * `tableId` would resolve in one read and then need a second one - against a
 * collection a guest may not read at all - to say where the guest is sitting.
 * `syncTableQrTokenOnTableWrite` is what keeps the copy true.
 *
 * `tableEnabled` is here for the same reason and answers a different question:
 * a table taken out of service after its sheet was printed keeps its token, so
 * the code on the table resolves to "not in service" rather than to nothing.
 * Refusing the order is issue #1072's.
 */
export interface TableQrToken {
  restaurantId: string;
  roomId: string;
  tableId: string;
  tableLabel: string;
  tableEnabled: boolean;
  status: TableQrTokenStatus;
  issuedAt: string;
  issuedAtTimestamp: number;
  /** When the token stopped being active. Absent while it is. */
  endedAt?: string;
  endedAtTimestamp?: number;
  /** The token that replaced this one. Only on a `superseded` token. */
  supersededBy?: string;
}

export interface IssueTableQrTokensRequest {
  restaurantId?: unknown;
  /** The tables to issue for. Absent means every enabled table. */
  tableIds?: unknown;
}

export interface RotateTableQrTokenRequest {
  restaurantId?: unknown;
  tableId?: unknown;
}

export interface TableQrTokenResult {
  tableId: string;
  label: string;
  token: string;
  /**
   * `existing` is the idempotent repeat: the table already held an active
   * token, so nothing was written and the printed code stays valid. The same
   * shape `addRestaurantStaff` uses for `already-staff`.
   */
  status: 'issued' | 'existing' | 'rotated';
  /** The token this one replaced, on a rotation. */
  previousToken?: string;
}

export interface IssueTableQrTokensResult {
  restaurantId: string;
  tokens: TableQrTokenResult[];
  /** Tables that were asked for and are not in service, so got no token. */
  skippedTableIds: string[];
}

export type RotateTableQrTokenResult = TableQrTokenResult & {
  restaurantId: string;
};

const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

/**
 * A token, drawn from the system CSPRNG and from nothing else.
 *
 * It takes no arguments, which is the acceptance criterion rather than an
 * accident of the signature: a token derived from a table number, a restaurant
 * id or a counter would be guessable from a code on the next table, and the
 * only way to be sure none of that happens is for none of it to be reachable
 * from here.
 */
export const generateTableQrToken = (): string =>
  Array.from(
    randomBytes(TOKEN_LENGTH),
    (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length],
  ).join('');

/**
 * The fields the token document copies from the table.
 *
 * One function, used by both the callables that write a token and the trigger
 * that keeps it in step, so the copy and the original cannot disagree about
 * which fields are mirrored or how an absent one reads.
 */
export const scanFieldsOfTable = (
  table: DocumentData,
): Pick<TableQrToken, 'roomId' | 'tableLabel' | 'tableEnabled'> => ({
  roomId: getString(table, 'roomId'),
  tableLabel: getString(table, 'label'),
  tableEnabled: table['enabled'] === true,
});

const tokensCollection = (): CollectionReference =>
  getFirestore().collection(TABLE_TOKENS_COLLECTION);

const tablesCollection = (restaurantId: string): CollectionReference =>
  getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLES_COLLECTION);

const isActive = (snapshot: DocumentSnapshot | undefined): boolean =>
  snapshot?.exists === true && snapshot.data()?.['status'] === 'active';

/**
 * Issues a token for one table, and supersedes its current one when asked.
 *
 * Everything happens in one transaction because the token document and the
 * table's `qrTokenId` are two halves of one fact. A table pointing at a token
 * that was never written resolves to nothing; a token nothing points at can
 * never be rotated, because rotation finds the current token *through* the
 * table. Neither half is recoverable by reading the other, so neither may land
 * alone.
 *
 * Ownership is re-checked inside the transaction against the restaurant read
 * there. The authorisation the caller passed happened before this commit, and
 * an assignment can be revoked in between - the same reason
 * `addRestaurantStaff` re-reads.
 *
 * A disabled table is refused rather than issued for. [[Table]] gives a token
 * to every *enabled* table, and a code printed for a table that is not in
 * service is a code that has to be reprinted or thrown away.
 */
const issueTokenForTable = async (
  request: CallableRequest<unknown>,
  actingUid: string,
  restaurantId: string,
  tableId: string,
  rotate: boolean,
): Promise<TableQrTokenResult> => {
  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const tableRef = tablesCollection(restaurantId).doc(tableId);

  return firestore.runTransaction(async (transaction) => {
    const [restaurant, table] = await Promise.all([
      transaction.get(restaurantRef),
      transaction.get(tableRef),
    ]);

    if (!restaurant.exists) {
      throw new HttpsError('not-found', 'Restaurant was not found.');
    }

    if (!holdsRestaurant(request, restaurant.data() ?? {}, actingUid)) {
      throw new HttpsError(
        'permission-denied',
        'This restaurant is not assigned to your account.',
      );
    }

    if (!table.exists) {
      throw new HttpsError('not-found', `Table ${tableId} was not found.`);
    }

    const tableData = table.data() ?? {};

    if (tableData['enabled'] !== true) {
      throw new HttpsError(
        'failed-precondition',
        `Table ${getString(tableData, 'label') || tableId} is not in service, so it gets no QR code.`,
      );
    }

    const currentToken = getString(tableData, 'qrTokenId');
    const current = currentToken
      ? await transaction.get(tokensCollection().doc(currentToken))
      : undefined;
    const replacing = isActive(current);

    if (replacing && !rotate) {
      return {
        tableId,
        label: getString(tableData, 'label'),
        token: currentToken,
        status: 'existing' as const,
      };
    }

    const token = generateTableQrToken();
    const tokenRef = tokensCollection().doc(token);

    // 130 bits says this cannot happen. Refusing rather than overwriting is
    // what makes that a claim about the odds instead of an assumption: the
    // caller sees `aborted`, draws again, and no table quietly loses its code.
    if ((await transaction.get(tokenRef)).exists) {
      throw new HttpsError(
        'aborted',
        'A generated token was already in use. Try again.',
      );
    }

    const now = new Date();
    const document: TableQrToken = {
      restaurantId,
      tableId,
      ...scanFieldsOfTable(tableData),
      status: 'active',
      issuedAt: now.toISOString(),
      issuedAtTimestamp: now.getTime(),
    };

    transaction.set(tokenRef, document);

    if (replacing && current) {
      transaction.update(current.ref, {
        status: 'superseded',
        supersededBy: token,
        endedAt: now.toISOString(),
        endedAtTimestamp: now.getTime(),
      });
    }

    transaction.update(tableRef, { qrTokenId: token });

    return {
      tableId,
      label: getString(tableData, 'label'),
      token,
      status: replacing ? ('rotated' as const) : ('issued' as const),
      previousToken: replacing ? currentToken : undefined,
    };
  });
};

/** The tables to act on: the ones asked for, or every table of the plan. */
const readTables = async (
  restaurantId: string,
  requested: string[],
): Promise<DocumentSnapshot[]> => {
  if (!requested.length) {
    return (await tablesCollection(restaurantId).get()).docs;
  }

  const found = await getFirestore().getAll(
    ...requested.map((tableId) => tablesCollection(restaurantId).doc(tableId)),
  );
  const missing = found
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => snapshot.id);

  if (missing.length) {
    throw new HttpsError(
      'not-found',
      `No table found for ${missing.join(', ')}.`,
    );
  }

  return found;
};

const parseTableIds = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new HttpsError('invalid-argument', 'tableIds must be strings.');
  }

  return value.map((id) => id.trim()).filter(Boolean);
};

/**
 * Gives every enabled table of a restaurant an active QR token.
 *
 * Idempotent, and that is the point rather than a nicety: this is called by
 * the publish step of issue #1088 and again by the QR sheet page of issue
 * #1087, and a second call that minted new tokens would invalidate every sheet
 * an owner had already printed. A table that already holds an active token is
 * reported as `existing` and nothing is written for it, which also means the
 * repeat costs one read per table rather than a transaction.
 *
 * Disabled tables are reported in `skippedTableIds` rather than refused, so
 * publishing a plan that contains one is not blocked by it. Naming a disabled
 * table explicitly *is* refused, by `issueTokenForTable`, because that is
 * somebody asking for a code that must not be printed.
 */
export const issueTableQrTokensHandler = async (
  request: CallableRequest<IssueTableQrTokensRequest>,
): Promise<IssueTableQrTokensResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const requested = parseTableIds(request.data?.tableIds);
  const actingUid = await requireRestaurantAuthority(request, restaurantId);

  logOperatorAction(request, {
    action: 'issueTableQrTokens',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'started',
    details: { requestedTables: requested.length },
  });

  const tables = await readTables(restaurantId, requested);

  // A whole-plan run skips the tables that are out of service; a run over named
  // tables does not, so naming a disabled one reaches `issueTokenForTable` and
  // is refused there. "There was nothing to do" and "you asked for a code that
  // must not be printed" are different answers.
  const targets = requested.length
    ? tables
    : tables.filter((table) => table.data()?.['enabled'] === true);
  const skippedTableIds = tables
    .filter((table) => !targets.includes(table))
    .map((table) => table.id);

  // One `getAll` for the tokens the tables already point at, so the repeat
  // call - the common one - transacts only for the tables that need it.
  const held = targets.filter((table) =>
    getString(table.data() ?? {}, 'qrTokenId'),
  );
  const heldTokens = held.length
    ? await getFirestore().getAll(
        ...held.map((table) =>
          tokensCollection().doc(getString(table.data() ?? {}, 'qrTokenId')),
        ),
      )
    : [];
  const activeTokens = new Set(
    heldTokens.filter(isActive).map((snapshot) => snapshot.id),
  );

  const tokens: TableQrTokenResult[] = [];

  for (const table of targets) {
    const data = table.data() ?? {};
    const currentToken = getString(data, 'qrTokenId');

    if (activeTokens.has(currentToken)) {
      tokens.push({
        tableId: table.id,
        label: getString(data, 'label'),
        token: currentToken,
        status: 'existing',
      });

      continue;
    }

    tokens.push(
      await issueTokenForTable(
        request,
        actingUid,
        restaurantId,
        table.id,
        false,
      ),
    );
  }

  logOperatorAction(request, {
    action: 'issueTableQrTokens',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    details: {
      issued: tokens.filter((token) => token.status === 'issued').length,
      existing: tokens.filter((token) => token.status === 'existing').length,
      skipped: skippedTableIds.length,
    },
  });

  return { restaurantId, tokens, skippedTableIds };
};

/**
 * Replaces one table's token with a new one.
 *
 * For the code that was photographed, put on social media, or printed onto a
 * sheet that left the building. The old token is superseded rather than
 * deleted, and names its successor: a guest scanning the old sheet is told the
 * code was replaced, and support can see that the table was reprinted rather
 * than retired.
 *
 * The table keeps its `id`, its `label` and everything pointing at it. A
 * rotation is a new code for the same table, not a new table.
 */
export const rotateTableQrTokenHandler = async (
  request: CallableRequest<RotateTableQrTokenRequest>,
): Promise<RotateTableQrTokenResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const tableId = parseRequiredString(request.data?.tableId, 'tableId');
  const actingUid = await requireRestaurantAuthority(request, restaurantId);

  logOperatorAction(request, {
    action: 'rotateTableQrToken',
    targetType: 'table',
    targetId: tableId,
    outcome: 'started',
    details: { restaurantId },
  });

  const result = await issueTokenForTable(
    request,
    actingUid,
    restaurantId,
    tableId,
    true,
  );

  logOperatorAction(request, {
    action: 'rotateTableQrToken',
    targetType: 'table',
    targetId: tableId,
    outcome: 'succeeded',
    details: { restaurantId, status: result.status },
  });

  return { restaurantId, ...result };
};

/**
 * Both callables are the restaurant's own, not an operator's.
 *
 * An owner prints and reprints their own table codes without a support
 * conversation, and an operator is admitted alongside them by `RD-UR-6` so
 * that a restaurant which has lost access has a way back - the classification
 * `restaurantAuthority` in `callable-authorization.spec.ts`.
 */
export const issueTableQrTokens = onAppCheck<IssueTableQrTokensRequest>(
  issueTableQrTokensHandler,
);

export const rotateTableQrToken = onAppCheck<RotateTableQrTokenRequest>(
  rotateTableQrTokenHandler,
);
