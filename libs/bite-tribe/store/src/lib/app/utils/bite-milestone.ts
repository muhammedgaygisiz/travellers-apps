/** The milestones below the first hundred; from 100 on, every hundred is one. */
const EARLY_MILESTONES = [50, 10, 5] as const;

/** The highest milestone at or below `count`, if `count` has reached one. */
const highestMilestoneAtOrBelow = (count: number): number | undefined => {
  if (count >= 100) {
    return Math.floor(count / 100) * 100;
  }

  return EARLY_MILESTONES.find((milestone) => count >= milestone);
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * The Bite-count milestone a profile update just reached, if any (issue
 * #2014).
 *
 * The milestones are 5, 10, 50, 100 and every further hundred (epic #2012). One
 * is reached when the previous `biteCount` is below it and the current one is
 * at or above it. An update that crosses several answers the highest, so it is
 * celebrated once. A drop or an unchanged count answers nothing, and so does a
 * previous count that is missing: there is no baseline to have crossed from.
 */
export const reachedBiteMilestone = (
  previous: number | null | undefined,
  current: number | null | undefined,
): number | undefined => {
  if (!isCount(previous) || !isCount(current) || current <= previous) {
    return undefined;
  }

  const milestone = highestMilestoneAtOrBelow(current);

  return milestone !== undefined && milestone > previous
    ? milestone
    : undefined;
};
