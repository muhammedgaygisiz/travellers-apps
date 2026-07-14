import { BatchResponse } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

export const getInvalidTokens = (
  res: BatchResponse,
  chunk: string[],
): string[] => {
  const invalidTokens: string[] = [];
  res.responses.forEach((r, idx) => {
    if (!r.success) {
      const errCode = r.error?.code ?? '';

      logger.error('--- Error sending notification', {
        error: r.error,
        token: chunk[idx],
      });
      if (
        errCode.includes('registration-token-not-registered') ||
        errCode.includes('invalid-argument')
      ) {
        invalidTokens.push(chunk[idx]);
      }
    }
  });
  return invalidTokens;
};
