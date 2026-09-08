jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {},
}));

import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';
import { logOperatorAction } from '../operator-log';

const ADMIN_UID = 'admin-uid';

const request = (
  roles: unknown = ['admin'],
  uid: string = ADMIN_UID,
): CallableRequest<unknown> =>
  ({ auth: { uid, token: { roles } } }) as unknown as CallableRequest<unknown>;

const payloadOf = (): Record<string, unknown> =>
  jest.mocked(logger.info).mock.calls[0][1] as Record<string, unknown>;

describe('logOperatorAction', () => {
  afterEach(() => jest.clearAllMocks());

  // Cloud Logging indexes `jsonPayload` fields, so every value an operator
  // queries by has to be a field rather than part of the message.
  it('records the actor, the action, the target and the outcome as fields', () => {
    logOperatorAction(request(), {
      action: 'setUserRoles',
      targetType: 'user',
      targetId: 'target-uid',
      outcome: 'succeeded',
    });

    expect(payloadOf()).toEqual({
      operatorAction: 'setUserRoles',
      callerUid: ADMIN_UID,
      callerRoles: ['admin'],
      targetType: 'user',
      targetId: 'target-uid',
      outcome: 'succeeded',
    });
  });

  // "What did this operator do" and "what was done to this account" are the two
  // questions the trail exists to answer, and both are one field lookup.
  it('reads the actor off the verified token rather than from the caller', () => {
    logOperatorAction(request(['admin', 'business'], 'someone-else'), {
      action: 'setUserRoles',
      targetType: 'user',
      targetId: 'target-uid',
      outcome: 'succeeded',
    });

    expect(payloadOf()).toMatchObject({
      callerUid: 'someone-else',
      callerRoles: ['admin', 'business'],
    });
  });

  it('drops a claimed role that is not a BiteTribe role', () => {
    logOperatorAction(request(['admin', 'superuser']), {
      action: 'setUserRoles',
      targetType: 'user',
      targetId: 'target-uid',
      outcome: 'succeeded',
    });

    expect(payloadOf()).toMatchObject({ callerRoles: ['admin'] });
  });

  it('carries the reason and the per-action details', () => {
    logOperatorAction(request(), {
      action: 'setUserSubscriptionTier',
      targetType: 'user',
      targetId: 'target-uid',
      outcome: 'succeeded',
      reason: 'refunded via support ticket 412',
      details: { previousTier: 0, tier: 1 },
    });

    expect(payloadOf()).toMatchObject({
      reason: 'refunded via support ticket 412',
      details: { previousTier: 0, tier: 1 },
    });
  });

  // An action that operates on a whole collection has a target type and no id,
  // so "which one" is absent rather than answered with something invented.
  it('omits the target id of a collection-wide action', () => {
    logOperatorAction(request(), {
      action: 'backfillReviewTimestamps',
      targetType: 'review',
      outcome: 'started',
    });

    expect(payloadOf()).not.toHaveProperty('targetId');
  });

  // A `started` with no matching `succeeded` is an operator action that crashed
  // or timed out, which the trail should still show.
  it('names the action and the outcome in the message', () => {
    logOperatorAction(request(), {
      action: 'verifyRestaurantCandidate',
      targetType: 'restaurantCandidate',
      targetId: 'candidate-id',
      outcome: 'started',
    });

    expect(logger.info).toHaveBeenCalledWith(
      'operator action: verifyRestaurantCandidate started',
      expect.anything(),
    );
  });
});
