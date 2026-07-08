import { Bite } from 'model';
import { adapter, BitesState, initialState } from '../../adapter';
import { adjustBiteLikeCounts } from '../adjust-bite-like-counts';

const bite = {
  id: 'bite1',
  name: 'Burger',
  thumbup: 2,
  drooling: 1,
} as Bite;

const otherBite = { id: 'bite2', name: 'Pizza', thumbup: 5 } as Bite;

const buildState = (): BitesState => ({
  ...adapter.upsertMany([bite, otherBite], initialState),
  latestBites: [bite, otherBite],
  bitesByUserId: [bite],
  bitesByBucketlist: [],
});

describe(adjustBiteLikeCounts.name, () => {
  it('should apply deltas to the bite entity', () => {
    const state = adjustBiteLikeCounts(buildState(), 'bite1', { thumbup: 1 });

    expect(state.entities['bite1']?.thumbup).toBe(3);
  });

  it('should apply deltas in latestBites and bitesByUserId', () => {
    const state = adjustBiteLikeCounts(buildState(), 'bite1', {
      thumbup: -1,
      drooling: 1,
    });

    const inLatest = state.latestBites.find((b) => b.id === 'bite1');
    const inByUser = state.bitesByUserId.find((b) => b.id === 'bite1');

    expect(inLatest?.thumbup).toBe(1);
    expect(inLatest?.drooling).toBe(2);
    expect(inByUser?.thumbup).toBe(1);
    expect(inByUser?.drooling).toBe(2);
  });

  it('should not touch other bites', () => {
    const state = adjustBiteLikeCounts(buildState(), 'bite1', { thumbup: 1 });

    expect(state.entities['bite2']?.thumbup).toBe(5);
    expect(state.latestBites.find((b) => b.id === 'bite2')?.thumbup).toBe(5);
  });

  it('should treat missing counts as zero', () => {
    const state = adjustBiteLikeCounts(buildState(), 'bite1', {
      mindblown: 1,
    });

    expect(state.entities['bite1']?.mindblown).toBe(1);
  });

  it('should never go below zero', () => {
    const state = adjustBiteLikeCounts(buildState(), 'bite1', {
      mindblown: -1,
    });

    expect(state.entities['bite1']?.mindblown).toBe(0);
  });

  it('should keep array references stable when the bite is not in them', () => {
    const initial = buildState();
    const state = adjustBiteLikeCounts(initial, 'bite2', { thumbup: 1 });

    expect(state.bitesByUserId).toBe(initial.bitesByUserId);
    expect(state.bitesByBucketlist).toBe(initial.bitesByBucketlist);
  });
});
