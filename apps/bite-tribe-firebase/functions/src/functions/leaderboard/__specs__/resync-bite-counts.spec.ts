import { getStoredBiteCount } from '../resync-bite-counts';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(),
    batch: jest.fn(),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

describe('resync bite counts helpers', () => {
  it('reads a numeric biteCount from the user document', () => {
    expect(getStoredBiteCount({ biteCount: 7 })).toBe(7);
  });

  it('defaults to 0 when biteCount is missing', () => {
    expect(getStoredBiteCount({})).toBe(0);
  });

  it('defaults to 0 when biteCount is not a number', () => {
    expect(getStoredBiteCount({ biteCount: 'not-a-number' })).toBe(0);
  });
});
