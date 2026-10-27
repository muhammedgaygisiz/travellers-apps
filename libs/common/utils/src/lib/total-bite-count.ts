/**
 * The total number of a user's Bites, from the aggregate stored on the user
 * document and the number of the user's Bites the client has loaded.
 *
 * The aggregate leads, because it is the only count that also covers Bites the
 * client never loaded, and counting the loaded ones alone would report a
 * paginated subset.
 *
 * It does not get the last word, though. The client's copy of the user
 * document can predate a write the user made themselves, and the aggregate
 * being a number in that case too meant the stale value was reported
 * unchallenged: after posting a Bite the header read one less than the list
 * right underneath it, and only an app restart repaired it (issue #1310).
 * A list longer than the aggregate claims is proof the aggregate is behind,
 * whether or not it is the whole list, so it raises the count. A list
 * shorter proves nothing — that is the paginated case.
 *
 * The profile header and the My Bites title both report this number, so the
 * two can never disagree (issue #1783).
 */
export const totalBiteCount = (
  aggregateBiteCount: number | undefined,
  loadedBiteCount: number,
): number =>
  typeof aggregateBiteCount === 'number'
    ? Math.max(aggregateBiteCount, loadedBiteCount)
    : loadedBiteCount;
